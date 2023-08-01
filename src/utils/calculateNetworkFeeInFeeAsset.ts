import { BigNumber } from 'bignumber.js';
import calculateNetworkFee from './calculateNetworkFee.js';

const calculateNetworkFeeInFeeAsset = (
  gasPriceGwei: BigNumber.Value,
  gasLimit: BigNumber.Value,
  baseCurrencyPrice: BigNumber.Value,
  feeAssetPrice: BigNumber.Value,
  feeAssetPriceInQuoteAsset: BigNumber.Value,
) => {
  const networkFee = calculateNetworkFee(gasPriceGwei, gasLimit);

  const networkFeeInQuoteAsset = new BigNumber(networkFee).multipliedBy(baseCurrencyPrice);
  const networkFeeInFeeAsset = networkFeeInQuoteAsset
    .div(new BigNumber(feeAssetPriceInQuoteAsset).multipliedBy(feeAssetPrice));

  return networkFeeInFeeAsset.toString();
};

export default calculateNetworkFeeInFeeAsset;
