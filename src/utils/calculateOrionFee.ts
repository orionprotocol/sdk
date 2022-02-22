import BigNumber from 'bignumber.js';

export default function calculateOrionFee(
  amount: string,
  feeAssetPriceInOrn: string,
  baseAssetPriceInOrn: string,
  feePercent: string,
) {
  return new BigNumber(amount)
    .multipliedBy(new BigNumber(feePercent).div(100))
    .multipliedBy(baseAssetPriceInOrn)
    .multipliedBy(new BigNumber(1).div(feeAssetPriceInOrn))
    .toString();
}
