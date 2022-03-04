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

  console.log(`
    Вычисляем комиссию сети в ассете комиссии.
    Берем комиссию в нативной криптовалюте ${networkFee.toString()}
    Умножаем на цену нативной криптовалюты в Орионах (${baseCurrencyPriceInOrn})
    Умножаем полученное (комиссия сети в Орионах) на развернутую цену ассета комиссии в орионах ${new BigNumber(1).div(feeAssetPriceInOrn).toString()}
    Итого: ${networkFee.toString()} 
    * ${baseCurrencyPriceInOrn} 
    * ${new BigNumber(1).div(feeAssetPriceInOrn).toString()}
    = ${networkFeeInFeeAsset.toString()}
  `);

  return networkFeeInFeeAsset.toString();
};

export default calculateNetworkFeeInFeeAsset;
