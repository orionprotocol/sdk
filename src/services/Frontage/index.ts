import { fetchWithValidation } from 'simple-typed-fetch';
import { searchTickersSchema } from './schemas';

export class Frontage {
  private readonly apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.searchTickers = this.searchTickers.bind(this);
  }

  searchTickers = () => {
    return fetchWithValidation(`${this.apiUrl}/api/v1/tickers/search`,
      searchTickersSchema
    );
  };
}

export * as schemas from './schemas/index.js';
