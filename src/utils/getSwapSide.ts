export default function getSwapSide(
  assetIn: string | null | undefined,
  assetOut: string | null | undefined,
  type: 'exactSpend' | 'exactReceive',
) {
  if (!assetIn || !assetOut) {
    return undefined;
  }

  if (assetOut === 'USDT') return 'SELL';
  if (assetIn === 'USDT') return 'BUY';
  if (type === 'exactSpend') return 'SELL';
  return 'BUY';
}
