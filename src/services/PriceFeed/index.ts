import fetchWithValidation from '../../fetchWithValidation';
import candlesSchema from './schemas/candlesSchema';
import { PriceFeedWS } from './ws';

class PriceFeed {
  private apiUrl: string;

  readonly ws: PriceFeedWS;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
    this.ws = new PriceFeedWS(this.wsUrl);

    this.getCandles = this.getCandles.bind(this);
  }

  getCandles = (
    symbol: string,
    timeStart: number,
    timeEnd: number,
    interval: '5m' | '30m' | '1h' | '1d',
    exchange: string,
  ) => {
    const url = new URL(this.candlesUrl);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('timeStart', timeStart.toString());
    url.searchParams.append('timeEnd', timeEnd.toString());
    url.searchParams.append('interval', interval);
    url.searchParams.append('exchange', exchange);

    return fetchWithValidation(
      url.toString(),
      candlesSchema,
    );
  };

  get wsUrl() {
    const url = new URL(this.apiUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws';
    return `${wsProtocol}://${url.host + url.pathname}/ws2`;
  }

  get candlesUrl() {
    return `${this.apiUrl}/candles/candles`;
  }
}

export * as schemas from './schemas';

export {
  PriceFeed,
};
