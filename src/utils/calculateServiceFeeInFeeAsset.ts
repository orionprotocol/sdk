import { BigNumber } from 'bignumber.js';
import convertPrice from './convertPrice.js';

export default function calculateServiceFeeInFeeAsset(
  amount: BigNumber.Value,
  baseAssetName: string,
  feeAssetName: string,
  feePercent: BigNumber.Value,
  prices: Partial<Record<string, string>>
) {
  const feeAmount = new BigNumber(amount).multipliedBy(new BigNumber(feePercent).div(100));

  const feeAssetAmount = convertPrice(
    feeAmount,
    baseAssetName,
    feeAssetName,
    prices
  );

  return feeAssetAmount;
}
