import BigNumber from 'bignumber.js';
import { FILL_ORDERS_GAS_LIMIT } from '../constants';
import calculateNetworkFeeInFeeAsset from './calculateNetworkFeeInFeeAsset';
import calculateOrionFee from './calculateOrionFee';

const calculateFee = (
  amount: BigNumber.Value,
  feeAssetPriceInOrn: BigNumber.Value,
  baseAssetPriceInOrn: BigNumber.Value,
  baseCurrencyPriceInOrn: BigNumber.Value,
  gasPrice: BigNumber.Value,
  feePercent: BigNumber.Value,
) => {
  const orionFee = calculateOrionFee(
    amount,
    feeAssetPriceInOrn,
    baseAssetPriceInOrn,
    feePercent,
  );
  const networkFeeInFeeAsset = calculateNetworkFeeInFeeAsset(
    gasPrice,
    FILL_ORDERS_GAS_LIMIT,
    baseCurrencyPriceInOrn,
    feeAssetPriceInOrn,
  );

  return {
    orionFee,
    networkFeeInFeeAsset,
    totalFee: new BigNumber(orionFee)
      .plus(networkFeeInFeeAsset)
      .toString(),
  };
};

export default calculateFee;
