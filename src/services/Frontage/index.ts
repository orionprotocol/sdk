import { fetchWithValidation } from 'simple-typed-fetch';
import { aggregatedMetricsSchema } from './schemas';

export class FrontageService {
  private readonly apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.getAggregatedMetrics = this.getAggregatedMetrics.bind(this);
  }

  readonly getAggregatedMetrics = () => {
    const url = new URL(`${this.apiUrl}/api/v1/metrics/aggregated`);
    return fetchWithValidation(
      url.toString(),
      aggregatedMetricsSchema,
    );
  };
}

export * as schemas from './schemas/index.js';
