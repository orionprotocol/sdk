import { BigNumber } from 'bignumber.js';
import convertPrice from './convertPrice.js';

export default function calculateServiceFeeInFeeAsset(
  amount: BigNumber.Value,
  baseAssetAddress: string,
  feeAssetAddress: string,
  feePercent: BigNumber.Value,
  prices: Partial<Record<string, string>>
) {
  const feeAmount = new BigNumber(amount).multipliedBy(new BigNumber(feePercent).div(100));

  const feeAssetAmount = convertPrice(
    feeAmount,
    baseAssetAddress,
    feeAssetAddress,
    prices
  );

  return feeAssetAmount;
}
