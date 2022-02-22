import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { NATIVE_CURRENCY_PRECISION } from '../constants/precisions';

export default function calculateNetworkFee(
  gasPriceGwei: string,
  gasLimit: number | string,
) {
  const networkFeeGwei = new BigNumber(gasPriceGwei).multipliedBy(gasLimit);
  const bn = new BigNumber(ethers.utils.parseUnits(networkFeeGwei.toString(), 'gwei').toString());
  return bn.div(new BigNumber(10).pow(NATIVE_CURRENCY_PRECISION)).toString();
}
