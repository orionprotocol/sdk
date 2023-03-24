import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { Exchange__factory } from '@orionprotocol/contracts';
import getBalances from '../../utils/getBalances';
import BalanceGuard from '../../BalanceGuard';
import getAvailableSources from '../../utils/getAvailableFundsSources';
import { INTERNAL_ORION_PRECISION, NATIVE_CURRENCY_PRECISION, SWAP_THROUGH_ORION_POOL_GAS_LIMIT } from '../../constants';
import getNativeCryptocurrency from '../../utils/getNativeCryptocurrency';
import { calculateFeeInFeeAsset, denormalizeNumber, normalizeNumber } from '../../utils';
import { signOrder } from '../../crypt';
import type orderSchema from '../../services/OrionAggregator/schemas/orderSchema';
import type { z } from 'zod';
import type { SwapLimitParams } from './swapLimit';
import { simpleFetch } from 'simple-typed-fetch';

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
  through: 'orion_pool'
  txHash: string
  wait: (confirmations?: number | undefined) => Promise<ethers.providers.TransactionReceipt>
}

export type Swap = AggregatorOrder | PoolSwap;

export default async function swapMarket({
  type,
  assetIn,
  assetOut,
  amount,
  feeAsset,
  slippagePercent,
  signer,
  orionUnit,
  options,
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
    orionBlockchain, orionAggregator, provider, chainId,
  } = orionUnit;
  const {
    exchangeContractAddress,
    matcherAddress,
    assetToAddress,
  } = await simpleFetch(orionBlockchain.getInfo)();
  const nativeCryptocurrency = getNativeCryptocurrency(assetToAddress);

  const exchangeContract = Exchange__factory.connect(exchangeContractAddress, provider);
  const feeAssets = await simpleFetch(orionBlockchain.getTokensFee)();
  const pricesInOrn = await simpleFetch(orionBlockchain.getPrices)();
  const gasPriceWei = await simpleFetch(orionBlockchain.getGasPriceWei)();
  const { factories } = await simpleFetch(orionBlockchain.getPoolsConfig)();
  const poolExchangesList = factories !== undefined ? Object.keys(factories) : [];

  const gasPriceGwei = ethers.utils.formatUnits(gasPriceWei, 'gwei').toString();

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
      [nativeCryptocurrency]: ethers.constants.AddressZero,
    },
    orionAggregator,
    walletAddress,
    exchangeContract,
    provider,
  );

  const balanceGuard = new BalanceGuard(
    balances,
    {
      name: nativeCryptocurrency,
      address: ethers.constants.AddressZero,
    },
    provider,
    signer,
    options?.logger,
  );

  const swapInfo = await simpleFetch(orionAggregator.getSwapInfo)(
    type,
    assetIn,
    assetOut,
    amountBN.toString(),
    options?.instantSettlement,
    options?.poolOnly !== undefined && options.poolOnly
      ? 'pools'
      : undefined,
  );

  const { exchanges: swapExchanges } = swapInfo;

  const [firstSwapExchange] = swapExchanges;

  if (swapExchanges.length > 0) options?.logger?.(`Swap exchanges: ${swapExchanges.join(', ')}`);

  if (swapInfo.type === 'exactReceive' && amountBN.lt(swapInfo.minAmountOut)) {
    throw new Error(`Amount is too low. Min amountOut is ${swapInfo.minAmountOut} ${assetOut}`);
  }

  if (swapInfo.type === 'exactSpend' && amountBN.lt(swapInfo.minAmountIn)) {
    throw new Error(`Amount is too low. Min amountIn is ${swapInfo.minAmountIn} ${assetIn}`);
  }

  if (swapInfo.orderInfo === null) throw new Error(swapInfo.executionInfo);

  const [baseAssetName, quoteAssetName] = swapInfo.orderInfo.assetPair.split('-');
  if (baseAssetName === undefined) throw new Error('Base asset name is undefined');
  if (quoteAssetName === undefined) throw new Error('Quote asset name is undefined');

  const pairConfig = await simpleFetch(orionAggregator.getPairConfig)(`${baseAssetName}-${quoteAssetName}`);
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

    const pathAddresses = swapInfo.path.map((name) => {
      const assetAddress = assetToAddress[name];
      if (assetAddress === undefined) throw new Error(`No asset address for ${name}`);
      return assetAddress;
    });

    const amountOutWithSlippage = new BigNumber(swapInfo.amountOut)
      .multipliedBy(new BigNumber(1).minus(percent))
      .toString();
    const amountInWithSlippage = new BigNumber(swapInfo.amountIn)
      .multipliedBy(new BigNumber(1).plus(percent))
      .toString();

    const amountSpend = swapInfo.type === 'exactSpend' ? swapInfo.amountIn : amountInWithSlippage;

    balanceGuard.registerRequirement({
      reason: 'Amount spend',
      asset: {
        name: assetIn,
        address: assetInAddress,
      },
      amount: amountSpend.toString(),
      spenderAddress: exchangeContractAddress,
      sources: getAvailableSources('amount', assetInAddress, 'orion_pool'),
    });

    const amountReceive = swapInfo.type === 'exactReceive' ? swapInfo.amountOut : amountOutWithSlippage;
    const amountSpendBlockchainParam = normalizeNumber(
      amountSpend,
      INTERNAL_ORION_PRECISION,
      BigNumber.ROUND_CEIL,
    );
    const amountReceiveBlockchainParam = normalizeNumber(
      amountReceive,
      INTERNAL_ORION_PRECISION,
      BigNumber.ROUND_FLOOR,
    );
    const unsignedSwapThroughOrionPoolTx = await exchangeContract.populateTransaction.swapThroughOrionPool(
      amountSpendBlockchainParam,
      amountReceiveBlockchainParam,
      factoryAddress !== undefined
        ? [factoryAddress, ...pathAddresses]
        : pathAddresses,
      type === 'exactSpend',
    );

    unsignedSwapThroughOrionPoolTx.chainId = parseInt(chainId, 10);
    unsignedSwapThroughOrionPoolTx.gasPrice = ethers.BigNumber.from(gasPriceWei);

    unsignedSwapThroughOrionPoolTx.from = walletAddress;
    const amountSpendBN = new BigNumber(amountSpend);

    let value = new BigNumber(0);
    const denormalizedAssetInExchangeBalance = balances[assetIn]?.exchange;
    if (denormalizedAssetInExchangeBalance === undefined) throw new Error(`Asset '${assetIn}' exchange balance is not found`);
    if (assetIn === nativeCryptocurrency && amountSpendBN.gt(denormalizedAssetInExchangeBalance)) {
      value = amountSpendBN.minus(denormalizedAssetInExchangeBalance);
    }
    unsignedSwapThroughOrionPoolTx.value = normalizeNumber(
      value.dp(INTERNAL_ORION_PRECISION, BigNumber.ROUND_CEIL),
      NATIVE_CURRENCY_PRECISION,
      BigNumber.ROUND_CEIL,
    );
    unsignedSwapThroughOrionPoolTx.gasLimit = ethers.BigNumber.from(SWAP_THROUGH_ORION_POOL_GAS_LIMIT);

    const transactionCost = ethers.BigNumber.from(SWAP_THROUGH_ORION_POOL_GAS_LIMIT).mul(gasPriceWei);
    const denormalizedTransactionCost = denormalizeNumber(transactionCost, NATIVE_CURRENCY_PRECISION);

    balanceGuard.registerRequirement({
      reason: 'Network fee',
      asset: {
        name: nativeCryptocurrency,
        address: ethers.constants.AddressZero,
      },
      amount: denormalizedTransactionCost.toString(),
      sources: getAvailableSources('network_fee', ethers.constants.AddressZero, 'orion_pool'),
    });

    // if (value.gt(0)) {
    //   balanceGuard.registerRequirement({
    //     reason: 'Transaction value (extra amount)',
    //     asset: {
    //       name: nativeCryptocurrency,
    //       address: ethers.constants.AddressZero,
    //     },
    //     amount: value.toString(),
    //     sources: getAvailableSources('amount', ethers.constants.AddressZero, 'orion_pool'),
    //   });
    // }

    await balanceGuard.check(options?.autoApprove);

    const nonce = await provider.getTransactionCount(walletAddress, 'pending');
    unsignedSwapThroughOrionPoolTx.nonce = nonce;

    options?.logger?.('Signing transaction...');
    const swapThroughOrionPoolTxResponse = await signer.sendTransaction(unsignedSwapThroughOrionPoolTx);
    options?.logger?.(`Transaction sent. Tx hash: ${swapThroughOrionPoolTxResponse.hash}`);
    return {
      amountOut: swapInfo.amountOut,
      wait: swapThroughOrionPoolTxResponse.wait,
      through: 'orion_pool',
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
  const baseAssetPriceInOrn = pricesInOrn[baseAssetAddress];
  if (baseAssetPriceInOrn === undefined) throw new Error(`Base asset price ${baseAssetName} in ORN not found`);
  const baseCurrencyPriceInOrn = pricesInOrn[ethers.constants.AddressZero];
  if (baseCurrencyPriceInOrn === undefined) throw new Error('Base currency price in ORN not found');
  const feeAssetPriceInOrn = pricesInOrn[feeAssetAddress];
  if (feeAssetPriceInOrn === undefined) throw new Error(`Fee asset price ${feeAsset} in ORN not found`);
  const feePercent = feeAssets[feeAsset];
  if (feePercent === undefined) throw new Error(`Fee asset ${feeAsset} not available`);

  const { orionFeeInFeeAsset, networkFeeInFeeAsset, totalFeeInFeeAsset } = calculateFeeInFeeAsset(
    swapInfo.orderInfo.amount,
    feeAssetPriceInOrn,
    baseAssetPriceInOrn,
    baseCurrencyPriceInOrn,
    gasPriceGwei,
    feePercent,
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
    amount: networkFeeInFeeAsset,
    spenderAddress: exchangeContractAddress,
    sources: getAvailableSources('network_fee', feeAssetAddress, 'aggregator'),
  });

  balanceGuard.registerRequirement({
    reason: 'Orion fee',
    asset: {
      name: feeAsset,
      address: feeAssetAddress,
    },
    amount: orionFeeInFeeAsset,
    spenderAddress: exchangeContractAddress,
    sources: getAvailableSources('orion_fee', feeAssetAddress, 'aggregator'),
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
    false,
    signer,
    chainId,
  );
  const orderIsOk = await exchangeContract.validateOrder(signedOrder);
  if (!orderIsOk) throw new Error('Order is not valid');

  const { orderId } = await simpleFetch(orionAggregator.placeOrder)(signedOrder, false);
  options?.logger?.(`Order placed. Order id: ${orderId}`);

  return {
    amountOut: swapInfo.amountOut,
    wait: () => new Promise<z.infer<typeof orderSchema>>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout'))
      }, 60000);
      const interval = setInterval(() => {
        simpleFetch(orionAggregator.getOrder)(orderId).then((data) => {
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
