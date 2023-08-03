import { BigNumber } from 'bignumber.js';

export default function convertPrice(
  amount: BigNumber.Value,
  assetInAddress: string,
  assetOutAddress: string,
  prices: Partial<Record<string, string>> // quoted in quoteAsset. [address]: priceQuotedInQuoteAsset
) {
  const assetInPrice = prices[assetInAddress.toLowerCase()];
  if (assetInPrice === undefined) throw Error(`Price conversion: AssetIn (${assetInAddress}) price is undefined`);

  const assetOutPrice = prices[assetOutAddress.toLowerCase()];
  if (assetOutPrice === undefined) throw Error(`Price conversion: AssetOut (${assetOutAddress}) price is undefined`);

  const assetInPriceBN = new BigNumber(assetInPrice);
  const assetOutPriceBN = new BigNumber(assetOutPrice);

  const assetInAmountBN = new BigNumber(amount);

  const assetInAmountInQuoteAsset = assetInAmountBN.multipliedBy(assetInPriceBN);
  const assetInAmountInQuoteAssetBN = new BigNumber(assetInAmountInQuoteAsset);

  const assetOutAmountInQuoteAsset = assetInAmountInQuoteAssetBN.dividedBy(assetOutPriceBN);

  return assetOutAmountInQuoteAsset;
}
