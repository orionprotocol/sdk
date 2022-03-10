import BigNumber from 'bignumber.js';

export default function calculateOrionFee(
  amount: string,
  feeAssetPriceInOrn: string,
  baseAssetPriceInOrn: string,
  feePercent: string,
) {
  const result = new BigNumber(amount)
    .multipliedBy(new BigNumber(feePercent).div(100))
    .multipliedBy(baseAssetPriceInOrn)
    .multipliedBy(new BigNumber(1).div(feeAssetPriceInOrn))
    .toString();

  // console.log(`
  // Вычисляем комиссию Ориона в ассете комиссии.
  // Входное количество ${amount} умножаем на процент по даннному ассету (${feePercent}),
  // умножаем на цену Base ассета в Орионах (${baseAssetPriceInOrn}),
  // умножаем на "развернуюую" цену ассета комиссии в орионах (${new BigNumber(1).div(feeAssetPriceInOrn).toString()})
  // Итого: ${amount}
  // * ${new BigNumber(feePercent).div(100).toString()}
  // * ${baseAssetPriceInOrn}
  // * ${new BigNumber(1).div(feeAssetPriceInOrn).toString()}
  // = ${result}
  // `);

  return result;
}
