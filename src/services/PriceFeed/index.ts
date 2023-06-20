import { fetchWithValidation } from 'simple-typed-fetch';
import type { BasicAuthCredentials, Exchange } from '../../types.js';
import { statisticsOverviewSchema, topPairsStatisticsSchema } from './schemas/index.js';
import candlesSchema from './schemas/candlesSchema.js';
import { PriceFeedWS } from './ws/index.js';

class PriceFeed {
  private readonly apiUrl: string;

  private readonly basicAuth?: BasicAuthCredentials | undefined;

  readonly ws: PriceFeedWS;

  get api() {
    return this.apiUrl;
  }

  constructor(apiUrl: string, basicAuth?: BasicAuthCredentials) {
    this.apiUrl = apiUrl;
    this.ws = new PriceFeedWS(this.wsUrl);
    this.basicAuth = basicAuth;

    this.getCandles = this.getCandles.bind(this);
    this.getStatisticsOverview = this.getStatisticsOverview.bind(this);
    this.getTopPairStatistics = this.getTopPairStatistics.bind(this);
  }

  get basicAuthHeaders() {
    if (this.basicAuth) {
      return {
        Authorization: `Basic ${btoa(`${this.basicAuth.username}:${this.basicAuth.password}`)}`,
      };
    }
    return {};
  }

  getCandles = (
    symbol: string,
    timeStart: number,
    timeEnd: number,
    interval: '5m' | '30m' | '1h' | '1d',
    exchange = 'all'
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
      { headers: this.basicAuthHeaders }
    );
  };

  getStatisticsOverview = (exchange: Exchange | 'ALL' = 'ALL') => {
    const url = new URL(`${this.statisticsUrl}/overview`);
    url.searchParams.append('exchange', exchange);

    return fetchWithValidation(
      url.toString(),
      statisticsOverviewSchema,
      { headers: this.basicAuthHeaders }
    );
  }

  getTopPairStatistics = (exchange: Exchange | 'ALL' = 'ALL') => {
    const url = new URL(`${this.statisticsUrl}/top-pairs`);
    url.searchParams.append('exchange', exchange);

    return fetchWithValidation(
      url.toString(),
      topPairsStatisticsSchema,
      { headers: this.basicAuthHeaders }
    );
  }

  get wsUrl() {
    const url = new URL(this.apiUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss' : 'ws';
    return `${wsProtocol}://${url.host + url.pathname}/api/v1`;
  }

  get candlesUrl() {
    return `${this.apiUrl}/api/v1/candles`;
  }

  get statisticsUrl() {
    return `${this.apiUrl}/api/v1/statistics`;
  }
}

export * as schemas from './schemas/index.js';
export * as ws from './ws/index.js';
export { PriceFeed };
