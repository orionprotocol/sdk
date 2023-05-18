import { BigNumber } from 'bignumber.js';
import calculateNetworkFee from './calculateNetworkFee.js';

const calculateNetworkFeeInFeeAsset = (
  gasPriceGwei: BigNumber.Value,
  gasLimit: BigNumber.Value,
  baseCurrencyPriceInServiceToken: BigNumber.Value,
  feeAssetPriceInServiceToken: BigNumber.Value,
) => {
  const networkFee = calculateNetworkFee(gasPriceGwei, gasLimit);

  const networkFeeInServiceToken = new BigNumber(networkFee).multipliedBy(baseCurrencyPriceInServiceToken);
  const networkFeeInFeeAsset = networkFeeInServiceToken
    .multipliedBy(
      new BigNumber(1)
        .div(feeAssetPriceInServiceToken),
    );

  return networkFeeInFeeAsset.toString();
};

export default calculateNetworkFeeInFeeAsset;
