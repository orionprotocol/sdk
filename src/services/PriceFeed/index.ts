import fetchWithValidation from '../../fetchWithValidation';
import candlesSchema from './schemas/candlesSchema';

class PriceFeed {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.getCandles = this.getCandles.bind(this);
  }

  getCandles(
    symbol: string,
    timeStart: number,
    timeEnd: number,
    interval: '5m' | '30m' | '1h' | '1d',
    exchange: string,
  ) {
    const url = new URL(`https://${this.apiUrl}/candles/candles`);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('timeStart', timeStart.toString());
    url.searchParams.append('timeEnd', timeEnd.toString());
    url.searchParams.append('interval', interval);
    url.searchParams.append('exchange', exchange);

    return fetchWithValidation(
      url.toString(),
      candlesSchema,
    );
  }

  get candlesUrl() { return `https://${this.apiUrl}/candles/candles`; }

  get allTickersWSUrl() { return `wss://${this.apiUrl}/ws2/allTickers`; }

  get tickerWSUrl() { return `wss://${this.apiUrl}/ws2/ticker/`; }

  get lastPriceWSUrl() { return `wss://${this.apiUrl}/ws2/lastPrice/`; }
}

export * as schemas from './schemas';
export * as ws from './ws';

export {
  PriceFeed,
};
