import type { BigNumber } from 'bignumber.js';
import calculateNetworkFee from './calculateNetworkFee.js';
import convertPrice from './convertPrice.js';

const calculateNetworkFeeInFeeAsset = (
  gasPriceGwei: BigNumber.Value,
  gasLimit: BigNumber.Value,
  baseCurrencyName: string,
  feeAssetName: string,
  prices: Partial<Record<string, string>>
) => {
  const networkFee = calculateNetworkFee(gasPriceGwei, gasLimit);

  return convertPrice(
    networkFee,
    baseCurrencyName, // from
    feeAssetName, // to
    prices
  );
};

export default calculateNetworkFeeInFeeAsset;
