import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { Exchange__factory } from '@orionprotocol/contracts/lib/ethers-v6-cjs/index.js';
import getBalances from '../../utils/getBalances.js';
import BalanceGuard from '../../BalanceGuard.js';
import getAvailableSources from '../../utils/getAvailableFundsSources.js';
import { INTERNAL_PROTOCOL_PRECISION, NATIVE_CURRENCY_PRECISION, SWAP_THROUGH_ORION_POOL_GAS_LIMIT } from '../../constants/index.js';
import getNativeCryptocurrencyName from '../../utils/getNativeCryptocurrencyName.js';
import { calculateFeeInFeeAsset, denormalizeNumber, normalizeNumber } from '../../utils/index.js';
import { signOrder } from '../../crypt/index.js';
import type orderSchema from '../../services/Aggregator/schemas/orderSchema.js';
import type { z } from 'zod';
import type { SwapLimitParams } from './swapLimit.js';
import { simpleFetch } from 'simple-typed-fetch';
import { generateSwapCalldata } from './generateSwapCalldata.js';
import isValidFactory from '../../utils/isValidFactory.js';
import type { SingleSwap } from '../../types.js';
import { must, safeGet } from '../../utils/safeGetters.js';

export type SwapMarketParams = Omit<SwapLimitParams, 'price'> & {
  slippagePercent: BigNumber.Value
}

type AggregatorOrder = {
  amountOut: number
  through: 'aggregator'
  id: string
  wait: () => Promise<z.infer<typeof orderSchema>>
}

type PoolSwap = {
  amountOut: number
  through: 'pool'
  txHash: string
  wait: (confirmations?: number | undefined) => Promise<ethers.TransactionReceipt | null>
}

export type Swap = AggregatorOrder | PoolSwap;

const isValidSingleSwap = (singleSwap: Omit<SingleSwap, 'factory'> & { factory: string }): singleSwap is SingleSwap => {
  return isValidFactory(singleSwap.factory);
}

export default async function swapMarket({
  assetIn,
  assetOut,
  amount,
  feeAsset,
  slippagePercent,
  signer,
  unit,
  options,
  isTradeBuy = false,
}: SwapMarketParams): Promise<Swap> {
  if (options?.developer) options.logger?.('YOU SPECIFIED A DEVELOPER OPTIONS. BE CAREFUL!');

  if (amount === '') throw new Error('Amount can not be empty');
  if (assetIn === '') throw new Error('AssetIn can not be empty');
  if (assetOut === '') throw new Error('AssetOut can not be empty');
  if (feeAsset === '') throw new Error('Fee asset can not be empty');
  if (slippagePercent === '') throw new Error('Slippage percent can not be empty');

  const amountBN = new BigNumber(amount);
  if (amountBN.isNaN()) throw new Error(`Amount '${amountBN.toString()}' is not a number`);
  if (amountBN.lte(0)) throw new Error(`Amount '${amountBN.toString()}' should be greater than 0`);

  const slippagePercentBN = new BigNumber(slippagePercent);
  if (slippagePercentBN.isNaN()) throw new Error(`Slippage percent '${slippagePercentBN.toString()}' is not a number`);
  if (slippagePercentBN.lte(0)) throw new Error('Slippage percent should be greater than 0');
  if (slippagePercentBN.gte(50)) throw new Error('Slippage percent should be less than 50');

  const walletAddress = await signer.getAddress();
  options?.logger?.(`Wallet address is ${walletAddress}`);

  const {
    blockchainService, aggregator, provider, chainId,
  } = unit;
  const {
    exchangeContractAddress,
    matcherAddress,
    assetToAddress,
    swapExecutorContractAddress,
  } = await simpleFetch(blockchainService.getInfo)();
  const nativeCryptocurrency = getNativeCryptocurrencyName(assetToAddress);

  const exchangeContract = Exchange__factory.connect(exchangeContractAddress, provider);
  const feeAssets = await simpleFetch(blockchainService.getPlatformFees)({ walletAddress, assetIn, assetOut });
  const allPrices = await simpleFetch(blockchainService.getPricesWithQuoteAsset)();
  const gasPriceWei = await simpleFetch(blockchainService.getGasPriceWei)();
  const { factories, WETHAddress } = await simpleFetch(blockchainService.getPoolsConfig)();
  must(WETHAddress, 'WETHAddress is not defined');
  const poolExchangesList = factories !== undefined ? Object.keys(factories) : [];

  const gasPriceGwei = ethers.formatUnits(gasPriceWei, 'gwei').toString();

  const assetInAddress = assetToAddress[assetIn];
  if (assetInAddress === undefined) throw new Error(`Asset '${assetIn}' not found`);
  const feeAssetAddress = assetToAddress[feeAsset];
  if (feeAssetAddress === undefined) {
    throw new Error(`Fee asset '${feeAsset}' not found. Available assets: ${Object.keys(feeAssets).join(', ')}`);
  }

  const balances = await getBalances(
    {
      [assetIn]: assetInAddress,
      [feeAsset]: feeAssetAddress,
      [nativeCryptocurrency]: ethers.ZeroAddress,
    },
    aggregator,
    walletAddress,
    exchangeContract,
    provider,
  );

  const balanceGuard = new BalanceGuard(
    balances,
    {
      name: nativeCryptocurrency,
      address: ethers.ZeroAddress,
    },
    provider,
    signer,
    options?.logger,
  );

  const swapInfo = await simpleFetch(aggregator.getSwapInfo)(
    assetIn,
    assetOut,
    amountBN.toString(),
    options?.instantSettlement,
    options?.poolOnly !== undefined && options.poolOnly
      ? 'pools'
      : undefined,
    isTradeBuy,
  );

  const { exchanges: swapExchanges, exchangeContractPath } = swapInfo;

  const [firstSwapExchange] = swapExchanges;

  if (swapExchanges.length > 0) options?.logger?.(`Swap exchanges: ${swapExchanges.join(', ')}`);

  if (swapInfo?.isTradeBuy && amountBN.lt(swapInfo.minAmountOut)) {
    throw new Error(`Amount is too low. Min amountOut is ${swapInfo.minAmountOut} ${assetOut}`);
  }

  if (!(swapInfo?.isTradeBuy) && amountBN.lt(swapInfo.minAmountIn)) {
    throw new Error(`Amount is too low. Min amountIn is ${swapInfo.minAmountIn} ${assetIn}`);
  }

  if (swapInfo.orderInfo === null) throw new Error(swapInfo.executionInfo);

  const [baseAssetName, quoteAssetName] = swapInfo.orderInfo.assetPair.split('-');
  if (baseAssetName === undefined) throw new Error('Base asset name is undefined');
  if (quoteAssetName === undefined) throw new Error('Quote asset name is undefined');

  const pairConfig = await simpleFetch(aggregator.getPairConfig)(`${baseAssetName}-${quoteAssetName}`);
  const qtyPrecisionBN = new BigNumber(pairConfig.qtyPrecision);
  const qtyDecimalPlaces = amountBN.dp();

  if (qtyDecimalPlaces === null) throw new Error('Qty decimal places is null. Likely amount is -Infinity, +Infinity or NaN');

  if (qtyPrecisionBN.lt(qtyDecimalPlaces)) {
    throw new Error(
      `Actual amount decimal places (${qtyDecimalPlaces}) is greater than max allowed decimal places (${qtyPrecisionBN.toString()}) on pair ${baseAssetName}-${quoteAssetName}.`
    );
  }

  let route: 'aggregator' | 'pool';

  const percent = new BigNumber(slippagePercent).div(100);

  if (options?.developer?.route !== undefined) {
    route = options.developer.route;
    options.logger?.(`Swap is through ${route} (because route forced to ${route})`);
  } else if (options?.poolOnly !== undefined && options.poolOnly) {
    options.logger?.('Swap is through pool (because "poolOnly" option is true)');
    route = 'pool';
  } else if (
    poolExchangesList.length > 0 &&
    swapExchanges.length === 1 &&
    firstSwapExchange !== undefined &&
    poolExchangesList.some((poolExchange) => poolExchange === firstSwapExchange)
  ) {
    options?.logger?.(`Swap is through pool [via ${firstSwapExchange}] (detected by "exchanges" field)`);
    route = 'pool';
  } else {
    route = 'aggregator';
  }

  if (route === 'pool') {
    let factoryAddress: string | undefined;
    if (factories && firstSwapExchange !== undefined) {
      factoryAddress = factories[firstSwapExchange];
      if (factoryAddress !== undefined) options?.logger?.(`Factory address is ${factoryAddress}. Exchange is ${firstSwapExchange}`);
    }

    const amountOutWithSlippage = new BigNumber(swapInfo.amountOut)
      .multipliedBy(new BigNumber(1).minus(percent))
      .toString();
    const amountInWithSlippage = new BigNumber(swapInfo.amountIn)
      .multipliedBy(new BigNumber(1).plus(percent))
      .toString();

    const amountSpend = swapInfo?.isTradeBuy ? amountInWithSlippage : swapInfo.amountIn;

    balanceGuard.registerRequirement({
      reason: 'Amount spend',
      asset: {
        name: assetIn,
        address: assetInAddress,
      },
      amount: amountSpend.toString(),
      spenderAddress: exchangeContractAddress,
      sources: getAvailableSources('amount', assetInAddress, 'pool'),
    });

    const amountReceive = swapInfo?.isTradeBuy ? amountOutWithSlippage : swapInfo.amountOut;
    const amountSpendBlockchainParam = normalizeNumber(
      amountSpend,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_CEIL,
    );
    const amountReceiveBlockchainParam = normalizeNumber(
      amountReceive,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_FLOOR,
    );
    const { calldata, swapDescription, value } = await generateSwapCalldata({
      amount: amountSpendBlockchainParam,
      minReturnAmount: amountReceiveBlockchainParam,
      path: exchangeContractPath.filter(isValidSingleSwap),
      initiatorAddress: walletAddress,
      receiverAddress: walletAddress,
      provider,

      matcher: matcherAddress,
      feeToken: feeAssetAddress,
      fee: 0,
      exchangeContractAddress,
      swapExecutorContractAddress,
      wethAddress: WETHAddress,

      curveRegistryAddress: safeGet(unit.contracts, 'curveRegistry'),
    })

    const unsignedSwapThroughPoolsTx = await exchangeContract.swap.populateTransaction(
      swapExecutorContractAddress,
      swapDescription,
      new Uint8Array(0),
      calldata,
      {
        value
      }
    );

    unsignedSwapThroughPoolsTx.chainId = BigInt(parseInt(chainId, 10));
    unsignedSwapThroughPoolsTx.gasPrice = BigInt(gasPriceWei);

    unsignedSwapThroughPoolsTx.from = walletAddress;
    const amountSpendBN = new BigNumber(amountSpend);

    let txValue = new BigNumber(0);
    const denormalizedAssetInExchangeBalance = balances[assetIn]?.exchange;
    if (denormalizedAssetInExchangeBalance === undefined) throw new Error(`Asset '${assetIn}' exchange balance is not found`);
    if (assetIn === nativeCryptocurrency && amountSpendBN.gt(denormalizedAssetInExchangeBalance)) {
      txValue = amountSpendBN.minus(denormalizedAssetInExchangeBalance);
    }
    unsignedSwapThroughPoolsTx.value = normalizeNumber(
      txValue.dp(INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_CEIL),
      NATIVE_CURRENCY_PRECISION,
      BigNumber.ROUND_CEIL,
    );
    unsignedSwapThroughPoolsTx.gasLimit = BigInt(SWAP_THROUGH_ORION_POOL_GAS_LIMIT);

    const transactionCost = BigInt(SWAP_THROUGH_ORION_POOL_GAS_LIMIT) * BigInt(gasPriceWei);
    const denormalizedTransactionCost = denormalizeNumber(transactionCost, BigInt(NATIVE_CURRENCY_PRECISION));

    balanceGuard.registerRequirement({
      reason: 'Network fee',
      asset: {
        name: nativeCryptocurrency,
        address: ethers.ZeroAddress,
      },
      amount: denormalizedTransactionCost.toString(),
      sources: getAvailableSources('network_fee', ethers.ZeroAddress, 'pool'),
    });

    // if (value.gt(0)) {
    //   balanceGuard.registerRequirement({
    //     reason: 'Transaction value (extra amount)',
    //     asset: {
    //       name: nativeCryptocurrency,
    //       address: ethers.ZeroAddress,
    //     },
    //     amount: value.toString(),
    //     sources: getAvailableSources('amount', ethers.ZeroAddress, 'pool'),
    //   });
    // }

    await balanceGuard.check(options?.autoApprove);

    const nonce = await provider.getTransactionCount(walletAddress, 'pending');
    unsignedSwapThroughPoolsTx.nonce = nonce;

    options?.logger?.('Signing transaction...');
    const swapThroughOrionPoolTxResponse = await signer.sendTransaction(unsignedSwapThroughPoolsTx);
    options?.logger?.(`Transaction sent. Tx hash: ${swapThroughOrionPoolTxResponse.hash}`);
    return {
      amountOut: swapInfo.amountOut,
      wait: swapThroughOrionPoolTxResponse.wait.bind(swapThroughOrionPoolTxResponse),
      through: 'pool',
      txHash: swapThroughOrionPoolTxResponse.hash,
    };
  }
  options?.logger?.('Swap through aggregator');

  const slippageMultiplier = new BigNumber(1).plus(
    swapInfo.orderInfo.side === 'SELL'
      ? percent.negated() // e.g. -0.01
      : percent, // e.g. 0.01
  );

  const safePriceWithDeviation = percent.isZero()
    ? swapInfo.orderInfo.safePrice
    : new BigNumber(swapInfo.orderInfo.safePrice)
      .multipliedBy(slippageMultiplier)
      .toString();

  const baseAssetAddress = assetToAddress[baseAssetName];
  if (baseAssetAddress === undefined) throw new Error(`No asset address for ${baseAssetName}`);
  const quoteAssetAddress = assetToAddress[quoteAssetName];
  if (quoteAssetAddress === undefined) throw new Error(`No asset address for ${quoteAssetName}`);

  const safePriceWithAppliedPrecision = new BigNumber(safePriceWithDeviation)
    .decimalPlaces(
      pairConfig.pricePrecision,
      swapInfo.orderInfo.side === 'BUY'
        ? BigNumber.ROUND_CEIL
        : BigNumber.ROUND_FLOOR,
    );

  balanceGuard.registerRequirement({
    reason: 'Amount',
    asset: {
      name: assetIn,
      address: assetInAddress,
    },
    amount: swapInfo.orderInfo.side === 'SELL'
      ? swapInfo.orderInfo.amount.toString()
      : safePriceWithAppliedPrecision.multipliedBy(swapInfo.orderInfo.amount).toString(),
    spenderAddress: exchangeContractAddress,
    sources: getAvailableSources('amount', assetInAddress, 'aggregator'),
  });

  // Fee calculation
  const feePercent = feeAssets[feeAsset];
  if (feePercent === undefined) throw new Error(`Fee asset ${feeAsset} not available`);

  const { serviceFeeInFeeAsset, networkFeeInFeeAsset, totalFeeInFeeAsset } = calculateFeeInFeeAsset(
    swapInfo.orderInfo.amount,
    gasPriceGwei,
    feePercent,
    baseAssetAddress,
    ethers.ZeroAddress,
    feeAssetAddress,
    allPrices.prices,
  );

  if (feeAsset === assetOut) {
    options?.logger?.('Fee asset equals received asset. The fee can be paid from the amount received');
    options?.logger?.(`Set extra balance: + ${swapInfo.amountOut} ${assetOut} to exchange`);

    balanceGuard.setExtraBalance(feeAsset, swapInfo.amountOut, 'exchange');
  }

  balanceGuard.registerRequirement({
    reason: 'Network fee',
    asset: {
      name: feeAsset,
      address: feeAssetAddress,
    },
    amount: networkFeeInFeeAsset.toString(),
    spenderAddress: exchangeContractAddress,
    sources: getAvailableSources('network_fee', feeAssetAddress, 'aggregator'),
  });

  balanceGuard.registerRequirement({
    reason: 'Service fee',
    asset: {
      name: feeAsset,
      address: feeAssetAddress,
    },
    amount: serviceFeeInFeeAsset.toString(),
    spenderAddress: exchangeContractAddress,
    sources: getAvailableSources('service_fee', feeAssetAddress, 'aggregator'),
  });

  await balanceGuard.check(options?.autoApprove);

  const signedOrder = await signOrder(
    baseAssetAddress,
    quoteAssetAddress,
    swapInfo.orderInfo.side,
    safePriceWithAppliedPrecision.toString(),
    swapInfo.orderInfo.amount,
    totalFeeInFeeAsset,
    walletAddress,
    matcherAddress,
    feeAssetAddress,
    signer,
    chainId,
  );
  const orderIsOk = await exchangeContract.validateOrder(signedOrder);
  if (!orderIsOk) throw new Error('Order is not valid');

  const { orderId } = await simpleFetch(aggregator.placeOrder)(signedOrder, false);
  options?.logger?.(`Order placed. Order id: ${orderId}`);

  return {
    amountOut: swapInfo.amountOut,
    wait: () => new Promise<z.infer<typeof orderSchema>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'))
      }, 60000);
      const interval = setInterval(() => {
        simpleFetch(aggregator.getOrder)(orderId).then((data) => {
          if (data.order.status === 'SETTLED') {
            options?.logger?.(`Order ${orderId} settled`);
            clearTimeout(timeout);
            clearInterval(interval);
            resolve(data);
          } else {
            options?.logger?.(`Order ${orderId} status: ${data.order.status}`);
          }
        }).catch((e) => {
          if (!(e instanceof Error)) throw new Error('Not an error');
          options?.logger?.(`Error while getting order status: ${e.message}`);
        });
      }, 1000);
    }),
    through: 'aggregator',
    id: orderId,
  };
}
