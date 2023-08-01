import type { BigNumber } from 'bignumber.js';
import calculateNetworkFee from './calculateNetworkFee.js';
import convertPrice from './convertPrice.js';

const calculateNetworkFeeInFeeAsset = (
  gasPriceGwei: BigNumber.Value,
  gasLimit: BigNumber.Value,
  baseCurrencyAddress: string,
  feeAssetAddress: string,
  prices: Partial<Record<string, string>>
) => {
  const networkFee = calculateNetworkFee(gasPriceGwei, gasLimit);

  return convertPrice(
    networkFee,
    baseCurrencyAddress, // from
    feeAssetAddress, // to
    prices
  );
};

export default calculateNetworkFeeInFeeAsset;
