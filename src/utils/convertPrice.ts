import { BigNumber } from 'bignumber.js';

export default function convertPrice(
  amount: BigNumber.Value,
  assetInAddress: string,
  assetOutAddress: string,
  prices: Partial<Record<string, string>> // quoted in quoteAsset. [address]: priceQuotedInQuoteAsset
) {
  const assetInPrice = prices[assetInAddress];
  if (assetInPrice === undefined) throw Error('assetInPrice is undefined');

  const assetOutPrice = prices[assetOutAddress];
  if (assetOutPrice === undefined) throw Error('assetOutPrice is undefined');

  const assetInPriceBN = new BigNumber(assetInPrice);
  const assetOutPriceBN = new BigNumber(assetOutPrice);

  const assetInAmountBN = new BigNumber(amount);

  const assetInAmountInQuoteAsset = assetInAmountBN.multipliedBy(assetInPriceBN);
  const assetInAmountInQuoteAssetBN = new BigNumber(assetInAmountInQuoteAsset);

  const assetOutAmountInQuoteAsset = assetInAmountInQuoteAssetBN.dividedBy(assetOutPriceBN);

  return assetOutAmountInQuoteAsset;
}
