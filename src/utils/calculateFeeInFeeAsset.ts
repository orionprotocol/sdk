import { BigNumber } from 'bignumber.js';
import { FILL_ORDERS_GAS_LIMIT } from '../constants/index.js';
import calculateNetworkFeeInFeeAsset from './calculateNetworkFeeInFeeAsset.js';
import calculateServiceFeeInFeeAsset from './calculateServiceFeeInFeeAsset.js';

const calculateFeeInFeeAsset = (
  amount: BigNumber.Value,
  feeAssetPrice: BigNumber.Value,
  baseAssetPrice: BigNumber.Value,
  baseCurrencyPrice: BigNumber.Value,
  gasPriceGwei: BigNumber.Value,
  feePercent: BigNumber.Value,
  feeAsset: string,
  assetPrices: Partial<Record<string, string>>,
) => {
  const feeAssetPriceInQuoteAsset = assetPrices[feeAsset];
  if (feeAssetPriceInQuoteAsset === undefined) throw Error('feeAssetPriceInQuoteAsset is undefined');

  const feeAssetPriceInQuoteAssetBN = new BigNumber(feeAssetPriceInQuoteAsset);

  const serviceFeeInFeeAsset = calculateServiceFeeInFeeAsset(
    amount,
    feeAssetPrice,
    baseAssetPrice,
    feePercent,
    feeAssetPriceInQuoteAssetBN
  );
  const networkFeeInFeeAsset = calculateNetworkFeeInFeeAsset(
    gasPriceGwei,
    FILL_ORDERS_GAS_LIMIT,
    baseCurrencyPrice,
    feeAssetPrice,
    feeAssetPriceInQuoteAssetBN
  );

  return {
    serviceFeeInFeeAsset,
    networkFeeInFeeAsset,
    totalFeeInFeeAsset: new BigNumber(serviceFeeInFeeAsset)
      .plus(networkFeeInFeeAsset)
      .toString(),
  };
};

export default calculateFeeInFeeAsset;
