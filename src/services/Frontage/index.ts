import { fetchWithValidation } from 'simple-typed-fetch';
import { tickersSchema } from './schemas';
import type { TickersBaseSearchParams, TickersCategories } from '../../types';

export class Frontage {
  private readonly apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  searchTickers = ({
    searchValue,
    currentNetwork,
    targetNetwork,
    sortBy,
    sortType,
    offset,
    limit,
  }: { searchValue: string } & TickersBaseSearchParams) => {
    const queryParams = new URLSearchParams({
      searchValue: encodeURIComponent(searchValue),
      currentNetwork: currentNetwork !== undefined ? encodeURIComponent(currentNetwork).toUpperCase() : '',
      targetNetwork: targetNetwork !== undefined ? encodeURIComponent(targetNetwork).toUpperCase() : '',
      sortBy: sortBy !== undefined ? encodeURIComponent(sortBy) : '',
      sortType: sortType !== undefined ? encodeURIComponent(sortType) : '',
      offset: offset !== undefined ? offset.toString() : '',
      limit: limit !== undefined ? limit.toString() : '',
    }).toString();

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
    tickers,
  }: { category: TickersCategories, tickers?: string } & TickersBaseSearchParams) => {
    const queryParams = new URLSearchParams({
      category: category === 'FAVORITES' && tickers !== undefined ? `tickers=${encodeURIComponent(tickers)}` : `category=${encodeURIComponent(category)}`,
      currentNetwork: currentNetwork !== undefined ? encodeURIComponent(currentNetwork).toUpperCase() : '',
      targetNetwork: targetNetwork !== undefined ? encodeURIComponent(targetNetwork).toUpperCase() : '',
      sortBy: sortBy !== undefined ? encodeURIComponent(sortBy) : '',
      sortType: sortType !== undefined ? encodeURIComponent(sortType) : '',
      offset: offset !== undefined ? offset.toString() : '',
      limit: limit !== undefined ? limit.toString() : '',
    }).toString();

    const url = category === 'FAVORITES' && tickers !== undefined
      ? `${this.apiUrl}/api/v1/tickers/get/favourites?${queryParams}`
      : `${this.apiUrl}/api/v1/tickers/get/category?${queryParams}`;

    return fetchWithValidation(
      url,
      tickersSchema
    );
  };
}

export * as schemas from './schemas/index.js';
