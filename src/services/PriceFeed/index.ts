import { fetchJsonWithValidation } from '../../fetchWithValidation';
import candlesSchema from './schemas/candlesSchema';
import PriceFeedAllTickersWS from './PriceFeedAllTickersWS';
import PriceFeedLastPriceWS from './PriceFeedLastPriceWS';
import PriceFeedTickerWS from './PriceFeedTickerWS';

class PriceFeed {
  private apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  getCandles(
    symbol: string,
    timeStart: number,
    timeEnd: number,
    interval: string,
  ) {
    const url = new URL(`https://${this.apiUrl}/candles/candles`);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('timeStart', timeStart.toString());
    url.searchParams.append('timeEnd', timeEnd.toString());
    url.searchParams.append('interval', interval);
    return fetchJsonWithValidation(
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
export {
  PriceFeed, PriceFeedAllTickersWS, PriceFeedTickerWS, PriceFeedLastPriceWS,
};
