import { BigNumber } from 'bignumber.js';
import { FILL_ORDERS_GAS_LIMIT } from '../constants/index.js';
import calculateNetworkFeeInFeeAsset from './calculateNetworkFeeInFeeAsset.js';
import calculateServiceFeeInFeeAsset from './calculateServiceFeeInFeeAsset.js';

const calculateFeeInFeeAsset = (
  amount: BigNumber.Value,
  feeAssetPriceInServiceToken: BigNumber.Value,
  baseAssetPriceInServiceToken: BigNumber.Value,
  baseCurrencyPriceInServiceToken: BigNumber.Value,
  gasPriceGwei: BigNumber.Value,
  feePercent: BigNumber.Value,
) => {
  const serviceFeeInFeeAsset = calculateServiceFeeInFeeAsset(
    amount,
    feeAssetPriceInServiceToken,
    baseAssetPriceInServiceToken,
    feePercent,
  );
  const networkFeeInFeeAsset = calculateNetworkFeeInFeeAsset(
    gasPriceGwei,
    FILL_ORDERS_GAS_LIMIT,
    baseCurrencyPriceInServiceToken,
    feeAssetPriceInServiceToken,
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
