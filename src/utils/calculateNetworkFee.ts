import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { NATIVE_CURRENCY_PRECISION } from '../constants/precisions';

export default function calculateNetworkFee(
  gasPriceGwei: string,
  gasLimit: number | string,
) {
  const networkFeeGwei = new BigNumber(gasPriceGwei).multipliedBy(gasLimit);

  // console.log(`
  //   Вычисляем комиссию сети в нативной валюте.
  //   Берем газ прайс в Gwei ${gasPriceGwei} и умножаем на газ лимит ${gasLimit}.
  //   Приводим к wei: ${ethers.utils.parseUnits(networkFeeGwei.toString(), 'gwei').toString()}
  // `);

  const bn = new BigNumber(ethers.utils.parseUnits(networkFeeGwei.toString(), 'gwei').toString());
  return bn.div(new BigNumber(10).pow(NATIVE_CURRENCY_PRECISION)).toString();
}
