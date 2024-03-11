const priceFeedSubscriptions = {
  TICKER: 'ticker',
  ALL_TICKERS: 'allTickers',
  LAST_PRICE: 'lastPrice',
  CANDLE: 'candle',
  CEX: 'cexPrices'
} as const;

export default priceFeedSubscriptions;
