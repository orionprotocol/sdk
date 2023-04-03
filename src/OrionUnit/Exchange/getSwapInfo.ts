import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { simpleFetch } from 'simple-typed-fetch';
import { NATIVE_CURRENCY_PRECISION, SWAP_THROUGH_ORION_POOL_GAS_LIMIT } from '../../constants/index.js';
import type { OrionAggregator } from '../../services/OrionAggregator/index.js';
import type { OrionBlockchain } from '../../services/OrionBlockchain/index.js';

import { calculateFeeInFeeAsset, denormalizeNumber, getNativeCryptocurrency } from '../../utils/index.js';

export type GetSwapInfoParams = {
  type: 'exactSpend' | 'exactReceive'
  assetIn: string
  assetOut: string
  amount: BigNumber.Value
  feeAsset: string
  orionBlockchain: OrionBlockchain
  orionAggregator: OrionAggregator
  options?: {
    instantSettlement?: boolean
    poolOnly?: boolean
  }
}

export default async function getSwapInfo({
  type,
  assetIn,
  assetOut,
  amount,
  feeAsset,
  orionBlockchain,
  orionAggregator,
  options,
}: GetSwapInfoParams) {
  if (amount === '') throw new Error('Amount can not be empty');
  if (assetIn === '') throw new Error('AssetIn can not be empty');
  if (assetOut === '') throw new Error('AssetOut can not be empty');
  if (feeAsset === '') throw new Error('Fee asset can not be empty');

  const amountBN = new BigNumber(amount);
  if (amountBN.isNaN()) throw new Error(`Amount '${amountBN.toString()}' is not a number`);
  if (amountBN.lte(0)) throw new Error(`Amount '${amountBN.toString()}' should be greater than 0`);

  const {
    assetToAddress,
  } = await simpleFetch(orionBlockchain.getInfo)();
  const nativeCryptocurrency = getNativeCryptocurrency(assetToAddress);

  const feeAssets = await simpleFetch(orionBlockchain.getTokensFee)();
  const pricesInOrn = await simpleFetch(orionBlockchain.getPrices)();
  const gasPriceWei = await simpleFetch(orionBlockchain.getGasPriceWei)();

  const gasPriceGwei = ethers.utils.formatUnits(gasPriceWei, 'gwei').toString();

  const assetInAddress = assetToAddress[assetIn];
  if (assetInAddress === undefined) throw new Error(`Asset '${assetIn}' not found`);
  const feeAssetAddress = assetToAddress[feeAsset];
  if (feeAssetAddress === undefined) {
    throw new Error(`Fee asset '${feeAsset}' not found. Available assets: ${Object.keys(feeAssets).join(', ')}`);
  }

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
  const { factories } = await simpleFetch(orionBlockchain.getPoolsConfig)();
  const poolExchangesList = factories !== undefined ? Object.keys(factories) : [];
  const [firstSwapExchange] = swapExchanges;

  // if (swapInfo.type === 'exactReceive' && amountBN.lt(swapInfo.minAmountOut)) {
  //   throw new Error(`Amount is too low. Min amountOut is ${swapInfo.minAmountOut} ${assetOut}`);
  // }

  // if (swapInfo.type === 'exactSpend' && amountBN.lt(swapInfo.minAmountIn)) {
  //   throw new Error(`Amount is too low. Min amountIn is ${swapInfo.minAmountIn} ${assetIn}`);
  // }

  // if (swapInfo.orderInfo === null) throw new Error(swapInfo.executionInfo);

  let route: 'pool' | 'aggregator';
  if (options?.poolOnly !== undefined && options.poolOnly) {
    route = 'pool';
  } else if (
    poolExchangesList.length > 0 &&
    swapExchanges.length === 1 &&
    firstSwapExchange !== undefined &&
    poolExchangesList.some((poolExchange) => poolExchange === firstSwapExchange)
  ) {
    route = 'pool';
  } else {
    route = 'aggregator';
  }

  if (route === 'pool') {
    const transactionCost = ethers.BigNumber.from(SWAP_THROUGH_ORION_POOL_GAS_LIMIT).mul(gasPriceWei);
    const denormalizedTransactionCost = denormalizeNumber(transactionCost, NATIVE_CURRENCY_PRECISION);

    return {
      route,
      swapInfo,
      fee: {
        assetName: nativeCryptocurrency,
        assetAddress: ethers.constants.AddressZero,
        networkFeeInFeeAsset: denormalizedTransactionCost.toString(),
        protocolFeeInFeeAsset: undefined,
      },
    };
  }

  if (swapInfo.orderInfo !== null) {
    const [baseAssetName] = swapInfo.orderInfo.assetPair.split('-');
    if (baseAssetName === undefined) throw new Error('Base asset name is undefined');
    const baseAssetAddress = assetToAddress[baseAssetName];
    if (baseAssetAddress === undefined) throw new Error(`No asset address for ${baseAssetName}`);

    // Fee calculation
    const baseAssetPriceInOrn = pricesInOrn[baseAssetAddress];
    if (baseAssetPriceInOrn === undefined) throw new Error(`Base asset price ${baseAssetName} in ORN not found`);
    const baseCurrencyPriceInOrn = pricesInOrn[ethers.constants.AddressZero];
    if (baseCurrencyPriceInOrn === undefined) throw new Error('Base currency price in ORN not found');
    const feeAssetPriceInOrn = pricesInOrn[feeAssetAddress];
    if (feeAssetPriceInOrn === undefined) throw new Error(`Fee asset price ${feeAsset} in ORN not found`);
    const feePercent = feeAssets[feeAsset];
    if (feePercent === undefined) throw new Error(`Fee asset ${feeAsset} not available`);

    const {
      orionFeeInFeeAsset,
      networkFeeInFeeAsset,
    } = calculateFeeInFeeAsset(
      swapInfo.orderInfo.amount,
      feeAssetPriceInOrn,
      baseAssetPriceInOrn,
      baseCurrencyPriceInOrn,
      gasPriceGwei,
      feePercent,
    );

    return {
      route,
      swapInfo,
      fee: {
        assetName: feeAsset,
        assetAddress: feeAssetAddress,
        networkFeeInFeeAsset,
        protocolFeeInFeeAsset: orionFeeInFeeAsset,
      },
    };
  }

  return {
    route,
    swapInfo,
    fee: {
      assetName: feeAsset,
      assetAddress: feeAssetAddress,
      networkFeeInFeeAsset: undefined,
      protocolFeeInFeeAsset: undefined,
    },
  };
}
