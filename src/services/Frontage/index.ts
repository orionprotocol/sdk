import { fetchWithValidation } from 'simple-typed-fetch';
import { tickersSchema } from './schemas';
import type { tickersBaseSearchParams, tickersCategories } from '../../types';

export class Frontage {
  private readonly apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.searchTickers = this.searchTickers.bind(this);
    this.getTickers = this.getTickers.bind(this);
  }

  searchTickers = ({
    searchValue,
    currentNetwork,
    targetNetwork,
    sortBy,
    sortType,
    offset,
    limit,
  }: { searchValue: string } & tickersBaseSearchParams) => {
    const queryParams = [
      `searchValue=${encodeURIComponent(searchValue)}`,
      currentNetwork !== undefined ? `&currentNetwork=${encodeURIComponent(currentNetwork)}` : '',
      targetNetwork !== undefined ? `&targetNetwork=${encodeURIComponent(targetNetwork)}` : '',
      sortBy !== undefined ? `&sortBy=${encodeURIComponent(sortBy)}` : '',
      sortType !== undefined ? `&sortType=${encodeURIComponent(sortType)}` : '',
      offset !== undefined ? `&offset=${offset}` : '',
      limit !== undefined ? `&limit=${limit}` : '',
    ].filter(Boolean).join('&');

    return fetchWithValidation(
      `${this.apiUrl}/api/v1/tickers/search?${queryParams}`,
      tickersSchema
    );
  };

  getTickers = ({
    category,
    currentNetwork,
    targetNetwork,
    sortBy,
    sortType,
    offset,
    limit,
  }: { category: tickersCategories } & tickersBaseSearchParams) => {
    const queryParams = [
      `category=${encodeURIComponent(category)}`,
      currentNetwork !== undefined ? `&currentNetwork=${encodeURIComponent(currentNetwork)}` : '',
      targetNetwork !== undefined ? `&targetNetwork=${encodeURIComponent(targetNetwork)}` : '',
      sortBy !== undefined ? `&sortBy=${encodeURIComponent(sortBy)}` : '',
      sortType !== undefined ? `&sortType=${encodeURIComponent(sortType)}` : '',
      offset !== undefined ? `&offset=${offset}` : '',
      limit !== undefined ? `&limit=${limit}` : '',
    ].filter(Boolean).join('&');

    return fetchWithValidation(
      `/api/v1/tickers/get?${queryParams}`,
      tickersSchema
    );
  };
}

export * as schemas from './schemas/index.js';
