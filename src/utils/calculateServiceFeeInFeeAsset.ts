import { BigNumber } from 'bignumber.js';

export default function calculateServiceFeeInFeeAsset(
  amount: BigNumber.Value,
  feeAssetPriceInServiceToken: BigNumber.Value,
  baseAssetPriceInServiceToken: BigNumber.Value,
  feePercent: BigNumber.Value,
) {
  const result = new BigNumber(amount)
    .multipliedBy(new BigNumber(feePercent).div(100))
    .multipliedBy(baseAssetPriceInServiceToken)
    .multipliedBy(new BigNumber(1).div(feeAssetPriceInServiceToken))
    .toString();

  return result;
}
