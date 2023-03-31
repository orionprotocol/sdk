import { BigNumber } from 'bignumber.js';
import { FILL_ORDERS_GAS_LIMIT } from '../constants/index.js';
import calculateNetworkFeeInFeeAsset from './calculateNetworkFeeInFeeAsset.js';
import calculateOrionFeeInFeeAsset from './calculateOrionFeeInFeeAsset.js';

const calculateFeeInFeeAsset = (
  amount: BigNumber.Value,
  feeAssetPriceInOrn: BigNumber.Value,
  baseAssetPriceInOrn: BigNumber.Value,
  baseCurrencyPriceInOrn: BigNumber.Value,
  gasPriceGwei: BigNumber.Value,
  feePercent: BigNumber.Value,
) => {
  const orionFeeInFeeAsset = calculateOrionFeeInFeeAsset(
    amount,
    feeAssetPriceInOrn,
    baseAssetPriceInOrn,
    feePercent,
  );
  const networkFeeInFeeAsset = calculateNetworkFeeInFeeAsset(
    gasPriceGwei,
    FILL_ORDERS_GAS_LIMIT,
    baseCurrencyPriceInOrn,
    feeAssetPriceInOrn,
  );

  return {
    orionFeeInFeeAsset,
    networkFeeInFeeAsset,
    totalFeeInFeeAsset: new BigNumber(orionFeeInFeeAsset)
      .plus(networkFeeInFeeAsset)
      .toString(),
  };
};

export default calculateFeeInFeeAsset;
