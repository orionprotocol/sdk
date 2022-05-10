/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable max-len */
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import getBalances from '../../utils/getBalances';
import BalanceGuard from '../../BalanceGuard';
import getAvailableSources from '../../utils/getAvailableFundsSources';
import OrionUnit from '..';
import { contracts, crypt, utils } from '../..';
import { INTERNAL_ORION_PRECISION, NATIVE_CURRENCY_PRECISION, SWAP_THROUGH_ORION_POOL_GAS_LIMIT } from '../../constants';
import getNativeCryptocurrency from '../../utils/getNativeCryptocurrency';
import simpleFetch from '../../simpleFetch';

export type SwapMarketParams = {
  type: 'exactSpend' | 'exactReceive',
  assetIn: string,
  assetOut: string,
  amount: BigNumber.Value,
  feeAsset: string,
  slippagePercent: BigNumber.Value,
  signer: ethers.Signer,
  orionUnit: OrionUnit,
  options?: {
    logger?: (message: string) => void,
    route?: 'pool' | 'aggregator',
    autoApprove?: boolean,
  }
}

type AggregatorOrder = {
  through: 'aggregator'
  id: string,
}

type PoolSwap = {
  through: 'orion_pool'
  txHash: string,
}

type Swap = AggregatorOrder | PoolSwap;

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
  if (options?.route) options?.logger?.('Warning! You specified route in options. Please use only if you know what you are doing.');
  if (amount === '') throw new Error('Amount can not be empty');
  if (assetIn === '') throw new Error('AssetIn can not be empty');
  if (assetOut === '') throw new Error('AssetOut can not be empty');
  if (feeAsset === '') throw new Error('Fee asset can not be empty');
  if (slippagePercent === '') throw new Error('Slippage percent can not be empty');

  const amountBN = new BigNumber(amount);
  if (amountBN.isNaN()) throw new Error(`Amount '${amount.toString()}' is not a number`);
  if (amountBN.lte(0)) throw new Error(`Amount '${amount.toString()}' should be greater than 0`);

  const slippagePercentBN = new BigNumber(slippagePercent);
  if (slippagePercentBN.isNaN()) throw new Error(`Slippage percent '${slippagePercent.toString()}' is not a number`);
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

  const exchangeContract = contracts.Exchange__factory.connect(exchangeContractAddress, provider);
  const feeAssets = await simpleFetch(orionBlockchain.getTokensFee)();
  const pricesInOrn = await simpleFetch(orionBlockchain.getPrices)();
  const gasPriceWei = await simpleFetch(orionBlockchain.getGasPriceWei)();

  const gasPriceGwei = ethers.utils.formatUnits(gasPriceWei, 'gwei').toString();

  const assetInAddress = assetToAddress[assetIn];
  if (!assetInAddress) throw new Error(`Asset '${assetIn}' not found`);
  const feeAssetAddress = assetToAddress[feeAsset];
  if (!feeAssetAddress) throw new Error(`Fee asset '${feeAsset}' not found. Available assets: ${Object.keys(feeAssets).join(', ')}`);

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
  );

  const swapInfo = await simpleFetch(orionAggregator.getSwapInfo)(type, assetIn, assetOut, amount.toString());

  if (swapInfo.type === 'exactReceive' && amountBN.lt(swapInfo.minAmountOut)) {
    throw new Error(`Amount is too low. Min amountOut is ${swapInfo.minAmountOut} ${assetOut}`);
  }

  if (swapInfo.type === 'exactSpend' && amountBN.lt(swapInfo.minAmountIn)) {
    throw new Error(`Amount is too low. Min amountIn is ${swapInfo.minAmountIn} ${assetIn}`);
  }

  if (swapInfo.orderInfo === null) throw new Error(swapInfo.executionInfo);

  const percent = new BigNumber(slippagePercent).div(100);

  const isThroughPoolOptimal = options?.route
    ? options?.route === 'pool'
    : swapInfo.isThroughPoolOptimal;

  if (isThroughPoolOptimal) {
    options?.logger?.('Swap through pool');
    const pathAddresses = swapInfo.path.map((name) => {
      const assetAddress = assetToAddress?.[name];
      if (!assetAddress) throw new Error(`No asset address for ${name}`);
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
    const unsignedSwapThroughOrionPoolTx = await exchangeContract.populateTransaction.swapThroughOrionPool(
      utils.normalizeNumber(
        amountSpend,
        INTERNAL_ORION_PRECISION,
        BigNumber.ROUND_CEIL,
      ),
      utils.normalizeNumber(
        amountReceive,
        INTERNAL_ORION_PRECISION,
        BigNumber.ROUND_FLOOR,
      ),
      pathAddresses,
      type === 'exactSpend',
    );

    unsignedSwapThroughOrionPoolTx.chainId = parseInt(chainId, 16);
    unsignedSwapThroughOrionPoolTx.gasPrice = ethers.BigNumber.from(gasPriceWei);

    unsignedSwapThroughOrionPoolTx.from = walletAddress;
    const amountSpendBN = new BigNumber(amountSpend);

    let value = new BigNumber(0);
    const denormalizedAssetInExchangeBalance = balances[assetIn]?.exchange;
    if (!denormalizedAssetInExchangeBalance) throw new Error(`Asset '${assetIn}' exchange balance is not found`);
    if (assetIn === nativeCryptocurrency && amountSpendBN.gt(denormalizedAssetInExchangeBalance)) {
      value = amountSpendBN.minus(denormalizedAssetInExchangeBalance);
    }
    unsignedSwapThroughOrionPoolTx.value = utils.normalizeNumber(value, NATIVE_CURRENCY_PRECISION, BigNumber.ROUND_CEIL);
    unsignedSwapThroughOrionPoolTx.gasLimit = ethers.BigNumber.from(SWAP_THROUGH_ORION_POOL_GAS_LIMIT);

    const transactionCost = ethers.BigNumber.from(SWAP_THROUGH_ORION_POOL_GAS_LIMIT).mul(gasPriceWei);
    const denormalizedTransactionCost = utils.denormalizeNumber(transactionCost, NATIVE_CURRENCY_PRECISION);

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

    const signedSwapThroughOrionPoolTx = await signer.signTransaction(unsignedSwapThroughOrionPoolTx);
    const swapThroughOrionPoolTxResponse = await provider.sendTransaction(signedSwapThroughOrionPoolTx);
    return {
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

  const [baseAssetName, quoteAssetName] = swapInfo.orderInfo.assetPair.split('-');
  const pairConfig = await simpleFetch(orionAggregator.getPairConfig)(`${baseAssetName}-${quoteAssetName}`);
  if (!pairConfig) throw new Error(`Pair config ${baseAssetName}-${quoteAssetName} not found`);

  const baseAssetAddress = assetToAddress[baseAssetName];
  if (!baseAssetAddress) throw new Error(`No asset address for ${baseAssetName}`);
  const quoteAssetAddress = assetToAddress[quoteAssetName];
  if (!quoteAssetAddress) throw new Error(`No asset address for ${quoteAssetName}`);

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
  const baseAssetPriceInOrn = pricesInOrn?.[baseAssetAddress];
  if (!baseAssetPriceInOrn) throw new Error(`Base asset price ${baseAssetName} in ORN not found`);
  const baseCurrencyPriceInOrn = pricesInOrn[ethers.constants.AddressZero];
  if (!baseCurrencyPriceInOrn) throw new Error('Base currency price in ORN not found');
  const feeAssetPriceInOrn = pricesInOrn[feeAssetAddress];
  if (!feeAssetPriceInOrn) throw new Error(`Fee asset price ${feeAsset} in ORN not found`);
  const feePercent = feeAssets?.[feeAsset];
  if (!feePercent) throw new Error(`Fee asset ${feeAsset} not available`);

  const { orionFeeInFeeAsset, networkFeeInFeeAsset, totalFeeInFeeAsset } = utils.calculateFeeInFeeAsset(
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

  const signedOrder = await crypt.signOrder(
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
  return {
    through: 'aggregator',
    id: orderId,
  };
}
