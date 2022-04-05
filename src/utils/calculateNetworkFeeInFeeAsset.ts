import BigNumber from 'bignumber.js';
import calculateNetworkFee from './calculateNetworkFee';

const calculateNetworkFeeInFeeAsset = (
  gasPrice: BigNumber.Value,
  gasLimit: BigNumber.Value,
  baseCurrencyPriceInOrn: BigNumber.Value,
  feeAssetPriceInOrn: BigNumber.Value,
) => {
  const networkFee = calculateNetworkFee(gasPrice, gasLimit);

  const networkFeeInOrn = new BigNumber(networkFee).multipliedBy(baseCurrencyPriceInOrn);
  const networkFeeInFeeAsset = networkFeeInOrn
    .multipliedBy(
      new BigNumber(1)
        .div(feeAssetPriceInOrn),
    );

  return networkFeeInFeeAsset.toString();
};

export default calculateNetworkFeeInFeeAsset;
