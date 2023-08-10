import { BigNumber } from 'bignumber.js';

export default function convertPrice(
  amount: BigNumber.Value,
  assetInName: string,
  assetOutName: string,
  prices: Partial<Record<string, string>> // quoted in quoteAsset. [name]: priceQuotedInQuoteAsset
) {
  const assetInPrice = prices[assetInName];
  if (assetInPrice === undefined) throw Error(`Price conversion: AssetIn (${assetInName}) price is undefined. Available prices: ${JSON.stringify(prices)}`);

  const assetOutPrice = prices[assetOutName];
  if (assetOutPrice === undefined) throw Error(`Price conversion: AssetOut (${assetOutName}) price is undefined. Available prices: ${JSON.stringify(prices)}`);

  const assetInPriceBN = new BigNumber(assetInPrice);
  const assetOutPriceBN = new BigNumber(assetOutPrice);

  const assetInAmountBN = new BigNumber(amount);

  const assetInAmountInQuoteAsset = assetInAmountBN.multipliedBy(assetInPriceBN);
  const assetInAmountInQuoteAssetBN = new BigNumber(assetInAmountInQuoteAsset);

  const assetOutAmountInQuoteAsset = assetInAmountInQuoteAssetBN.dividedBy(assetOutPriceBN);

  return assetOutAmountInQuoteAsset;
}
