import fetchJsonWithValidation from '../../fetchWithValidation';
import candlesSchema from './schemas/candlesSchema';

export default class PriceFeed {
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
    return fetchJsonWithValidation(
      `https://${this.apiUrl}/candles/candles`
        + `?symbol=${symbol}`
        + `&timeStart=${timeStart}`
        + `&timeEnd=${timeEnd}`
        + `&interval=${interval}`,
      candlesSchema,
    );
  }

  get candlesUrl() { return `https://${this.apiUrl}/candles/candles`; }

  get allTickersWSUrl() { return `wss://${this.apiUrl}/ws2/allTickers`; }

  get tickerWSUrl() { return `wss://${this.apiUrl}/ws2/ticker/`; }

  get lastPriceWSUrl() { return `wss://${this.apiUrl}/ws2/lastPrice/`; }
}
