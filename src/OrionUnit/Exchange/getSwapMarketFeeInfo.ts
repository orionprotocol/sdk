import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { utils } from '../..';
import { NATIVE_CURRENCY_PRECISION, SWAP_THROUGH_ORION_POOL_GAS_LIMIT } from '../../constants';
import { OrionAggregator } from '../../services/OrionAggregator';
import { OrionBlockchain } from '../../services/OrionBlockchain';

import simpleFetch from '../../simpleFetch';
import getNativeCryptocurrency from '../../utils/getNativeCryptocurrency';

export type GetSwapMarketInfoParams = {
  type: 'exactSpend' | 'exactReceive',
  assetIn: string,
  assetOut: string,
  amount: BigNumber.Value,
  feeAsset: string,
  orionBlockchain: OrionBlockchain,
  orionAggregator: OrionAggregator
  options?: {
    poolOnly?: boolean,
  }
}

export default async function getSwapMarketFeeInfo({
  type,
  assetIn,
  assetOut,
  amount,
  feeAsset,
  orionBlockchain,
  orionAggregator,
  options,
}: GetSwapMarketInfoParams) {
  if (amount === '') throw new Error('Amount can not be empty');
  if (assetIn === '') throw new Error('AssetIn can not be empty');
  if (assetOut === '') throw new Error('AssetOut can not be empty');
  if (feeAsset === '') throw new Error('Fee asset can not be empty');

  const amountBN = new BigNumber(amount);
  if (amountBN.isNaN()) throw new Error(`Amount '${amount.toString()}' is not a number`);
  if (amountBN.lte(0)) throw new Error(`Amount '${amount.toString()}' should be greater than 0`);

  const {
    assetToAddress,
  } = await simpleFetch(orionBlockchain.getInfo)();
  const nativeCryptocurrency = getNativeCryptocurrency(assetToAddress);

  const feeAssets = await simpleFetch(orionBlockchain.getTokensFee)();
  const pricesInOrn = await simpleFetch(orionBlockchain.getPrices)();
  const gasPriceWei = await simpleFetch(orionBlockchain.getGasPriceWei)();

  const gasPriceGwei = ethers.utils.formatUnits(gasPriceWei, 'gwei').toString();

  const assetInAddress = assetToAddress[assetIn];
  if (!assetInAddress) throw new Error(`Asset '${assetIn}' not found`);
  const feeAssetAddress = assetToAddress[feeAsset];
  if (!feeAssetAddress) throw new Error(`Fee asset '${feeAsset}' not found. Available assets: ${Object.keys(feeAssets).join(', ')}`);

  const swapInfo = await simpleFetch(orionAggregator.getSwapInfo)(
    type,
    assetIn,
    assetOut,
    amount.toString(),
    false,
    options?.poolOnly ? ['ORION_POOL'] : undefined,
  );

  if (swapInfo.orderInfo !== null && options?.poolOnly === true && options.poolOnly !== swapInfo.isThroughPoolOptimal) {
    throw new Error(`Unexpected Orion Aggregator response. Please, contact support. Report swap request id: ${swapInfo.id}`);
  }

  if (swapInfo.type === 'exactReceive' && amountBN.lt(swapInfo.minAmountOut)) {
    throw new Error(`Amount is too low. Min amountOut is ${swapInfo.minAmountOut} ${assetOut}`);
  }

  if (swapInfo.type === 'exactSpend' && amountBN.lt(swapInfo.minAmountIn)) {
    throw new Error(`Amount is too low. Min amountIn is ${swapInfo.minAmountIn} ${assetIn}`);
  }

  if (swapInfo.orderInfo === null) throw new Error(swapInfo.executionInfo);

  let isThroughPoolOptimal: boolean;
  if (options?.poolOnly) isThroughPoolOptimal = true;
  else isThroughPoolOptimal = swapInfo.isThroughPoolOptimal;

  if (isThroughPoolOptimal) {
    const transactionCost = ethers.BigNumber.from(SWAP_THROUGH_ORION_POOL_GAS_LIMIT).mul(gasPriceWei);
    const denormalizedTransactionCost = utils.denormalizeNumber(transactionCost, NATIVE_CURRENCY_PRECISION);

    return {
      feeAsset: nativeCryptocurrency,
      feeAssetAddress: ethers.constants.AddressZero,
      feeAmount: denormalizedTransactionCost.toString(),
    };
  }

  const [baseAssetName] = swapInfo.orderInfo.assetPair.split('-');
  if (baseAssetName === undefined) throw new Error('Base asset name is undefined');
  const baseAssetAddress = assetToAddress[baseAssetName];
  if (!baseAssetAddress) throw new Error(`No asset address for ${baseAssetName}`);

  // Fee calculation
  const baseAssetPriceInOrn = pricesInOrn?.[baseAssetAddress];
  if (!baseAssetPriceInOrn) throw new Error(`Base asset price ${baseAssetName} in ORN not found`);
  const baseCurrencyPriceInOrn = pricesInOrn[ethers.constants.AddressZero];
  if (!baseCurrencyPriceInOrn) throw new Error('Base currency price in ORN not found');
  const feeAssetPriceInOrn = pricesInOrn[feeAssetAddress];
  if (!feeAssetPriceInOrn) throw new Error(`Fee asset price ${feeAsset} in ORN not found`);
  const feePercent = feeAssets?.[feeAsset];
  if (!feePercent) throw new Error(`Fee asset ${feeAsset} not available`);

  const { totalFeeInFeeAsset } = utils.calculateFeeInFeeAsset(
    swapInfo.orderInfo.amount,
    feeAssetPriceInOrn,
    baseAssetPriceInOrn,
    baseCurrencyPriceInOrn,
    gasPriceGwei,
    feePercent,
  );

  return {
    feeAsset,
    feeAssetAddress,
    feeAmount: totalFeeInFeeAsset,
  };
}
