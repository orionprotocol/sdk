import BigNumber from 'bignumber.js';
import calculateNetworkFee from './calculateNetworkFee';

const calculateNetworkFeeInFeeAsset = (
  gasPrice: string,
  gasLimit: number,
  baseCurrencyPriceInOrn: string,
  feeAssetPriceInOrn: string,
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
