import { BigNumber } from 'bignumber.js';

export default function calculateServiceFeeInFeeAsset(
  amount: BigNumber.Value,
  feeAssetPriceInOrn: BigNumber.Value,
  baseAssetPriceInOrn: BigNumber.Value,
  feePercent: BigNumber.Value,
) {
  const result = new BigNumber(amount)
    .multipliedBy(new BigNumber(feePercent).div(100))
    .multipliedBy(baseAssetPriceInOrn)
    .multipliedBy(new BigNumber(1).div(feeAssetPriceInOrn))
    .toString();

  return result;
}
