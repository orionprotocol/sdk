import { BigNumber } from 'bignumber.js';

export default function calculateServiceFeeInFeeAsset(
  amount: BigNumber.Value,
  feeAssetPrice: BigNumber.Value,
  baseAssetPrice: BigNumber.Value,
  feePercent: BigNumber.Value,
  feeAssetPriceInQuoteAsset: BigNumber.Value,
) {
  const result = new BigNumber(amount)
    .multipliedBy(new BigNumber(feePercent).div(100))
    .multipliedBy(baseAssetPrice)
    .div(new BigNumber(feeAssetPriceInQuoteAsset).multipliedBy(feeAssetPrice))
    .toString();

  return result;
}
