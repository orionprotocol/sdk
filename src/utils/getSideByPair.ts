export default function getSideByPair(pair: string | undefined) {
  if (!pair) return undefined;
  const assets = pair.split('-');
  if (assets.length !== 2) throw new Error('Invalid pair');
  const [baseAsset] = assets;
  return baseAsset === 'USDT' ? 'BUY' : 'SELL';
}
