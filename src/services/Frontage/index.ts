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
    const url = new URL(this.apiUrl);
    const params = new URLSearchParams();

    params.set('searchValue', encodeURIComponent(searchValue));
    if (currentNetwork !== undefined) params.set('currentNetwork', encodeURIComponent(currentNetwork).toUpperCase());
    if (targetNetwork !== undefined) params.set('targetNetwork', encodeURIComponent(targetNetwork).toUpperCase());
    if (sortBy !== undefined) params.set('sortBy', encodeURIComponent(sortBy));
    if (sortType !== undefined) params.set('sortType', encodeURIComponent(sortType));
    if (offset !== undefined) params.set('offset', offset.toString());
    if (limit !== undefined) params.set('limit', limit.toString());

    url.pathname = '/api/v1/tickers/search';
    url.search = params.toString();

    return fetchWithValidation(
      url.toString(),
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
    const url = new URL(this.apiUrl);
    const params = new URLSearchParams();

    if (category === 'FAVORITES' && tickers !== undefined) params.set('tickers', tickers);
    if (category !== 'FAVORITES') params.set('category', category);
    if (currentNetwork !== undefined) params.set('currentNetwork', encodeURIComponent(currentNetwork).toUpperCase());
    if (targetNetwork !== undefined) params.set('targetNetwork', encodeURIComponent(targetNetwork).toUpperCase());
    if (sortBy !== undefined) params.set('sortBy', encodeURIComponent(sortBy));
    if (sortType !== undefined) params.set('sortType', encodeURIComponent(sortType));
    if (offset !== undefined) params.set('offset', offset.toString());
    if (limit !== undefined) params.set('limit', limit.toString());

    if (category === 'FAVORITES' && tickers !== undefined) {
      url.pathname = '/api/v1/tickers/get/favourites';
    } else {
      url.pathname = '/api/v1/tickers/get/category';
    }

    url.search = params.toString();

    return fetchWithValidation(
      url.toString(),
      tickersSchema
    );
  };
}

export * as schemas from './schemas/index.js';
