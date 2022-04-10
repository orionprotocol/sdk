// exact spend

// n X -> USDT - пара X-USDT (продажа амаунта на паре X-USDT)
// n USDT -> X - пара X-USDT (покупка на стоимость на паре X-USDT)
// n X -> Y - пара X-Y (продажа амаунта на паре X-Y)

// exact eceive

// X -> n USDT - пара X-USDT (продажа на стоимость на паре X-USDT)
// USDT -> n X - пара X-USDT (покупка амаунта на паре X-USDT)
// X -> n Y - пара Y-X (покупка амаунта на паре Y-X)

export default function getSwapPair(
  assetIn: string | null | undefined,
  assetOut: string | null | undefined,
  type: 'exactSpend' | 'exactReceive',
) {
  if (!assetIn || !assetOut) {
    return undefined;
  }

  if (assetOut === 'USDT') return `${assetIn}-USDT`;
  if (assetIn === 'USDT') return `${assetOut}-USDT`;
  if (type === 'exactSpend') return `${assetIn}-${assetOut}`;
  return `${assetOut}-${assetIn}`;
}
