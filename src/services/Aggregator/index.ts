import type { BigNumber } from 'bignumber.js';
import { z } from 'zod';
import swapInfoSchema from './schemas/swapInfoSchema.js';
import exchangeInfoSchema from './schemas/exchangeInfoSchema.js';
import cancelOrderSchema from './schemas/cancelOrderSchema.js';
import orderBenefitsSchema from './schemas/orderBenefitsSchema.js';
import errorSchema from './schemas/errorSchema.js';
import placeAtomicSwapSchema from './schemas/placeAtomicSwapSchema.js';
import { AggregatorWS } from './ws/index.js';
import { atomicSwapHistorySchema } from './schemas/atomicSwapHistorySchema.js';
import type { BasicAuthCredentials, SignedCancelOrderRequest, SignedOrder } from '../../types.js';
import {
  pairConfigSchema, aggregatedOrderbookSchema,
  exchangeOrderbookSchema, poolReservesSchema,
} from './schemas/index.js';
import type networkCodes from '../../constants/networkCodes.js';
import toUpperCase from '../../utils/toUpperCase.js';
import httpToWS from '../../utils/httpToWS.js';
import { ethers } from 'ethers';
import orderSchema from './schemas/orderSchema.js';
import { fetchWithValidation } from 'simple-typed-fetch';

class Aggregator {
  private readonly apiUrl: string;

  readonly ws: AggregatorWS;

  private readonly basicAuth?: BasicAuthCredentials | undefined;

  get api() {
    return this.apiUrl;
  }

  constructor(
    httpAPIUrl: string,
    wsAPIUrl: string,
    basicAuth?: BasicAuthCredentials
  ) {
    // const oaUrl = new URL(apiUrl);
    // const oaWsProtocol = oaUrl.protocol === 'https:' ? 'wss' : 'ws';
    // const aggregatorWsUrl = `${oaWsProtocol}://${oaUrl.host + (oaUrl.pathname === '/'
    //   ? ''
    //   : oaUrl.pathname)}/v1`;

    this.apiUrl = httpAPIUrl;
    this.ws = new AggregatorWS(httpToWS(wsAPIUrl));
    this.basicAuth = basicAuth;

    this.getHistoryAtomicSwaps = this.getHistoryAtomicSwaps.bind(this);
    this.getPairConfig = this.getPairConfig.bind(this);
    this.getPairConfigs = this.getPairConfigs.bind(this);
    this.getPairsList = this.getPairsList.bind(this);
    this.getSwapInfo = this.getSwapInfo.bind(this);
    this.getTradeProfits = this.getTradeProfits.bind(this);
    this.placeAtomicSwap = this.placeAtomicSwap.bind(this);
    this.placeOrder = this.placeOrder.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
    this.checkWhitelisted = this.checkWhitelisted.bind(this);
    this.getLockedBalance = this.getLockedBalance.bind(this);
    this.getAggregatedOrderbook = this.getAggregatedOrderbook.bind(this);
    this.getExchangeOrderbook = this.getExchangeOrderbook.bind(this);
    this.getPoolReserves = this.getPoolReserves.bind(this);
    this.getVersion = this.getVersion.bind(this);
    this.getPrices = this.getPrices.bind(this);
  }

  get basicAuthHeaders() {
    if (this.basicAuth) {
      return {
        Authorization: `Basic ${btoa(`${this.basicAuth.username}:${this.basicAuth.password}`)}`,
      };
    }
    return {};
  }

  getOrder = (orderId: string, owner?: string) => {
    if (!ethers.isHexString(orderId)) {
      throw new Error(`Invalid order id: ${orderId}. Must be a hex string`);
    }
    const url = new URL(`${this.apiUrl}/api/v1/order`);
    url.searchParams.append('orderId', orderId);
    if (owner !== undefined) {
      if (!ethers.isAddress(owner)) {
        throw new Error(`Invalid owner address: ${owner}`);
      }
      url.searchParams.append('owner', owner);
    }
    return fetchWithValidation(
      url.toString(),
      orderSchema,
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  }

  getPairsList = (market: 'spot') => {
    const url = new URL(`${this.apiUrl}/api/v1/pairs/list`);
    url.searchParams.append('market', toUpperCase(market));

    return fetchWithValidation(
      url.toString(),
      z.array(z.string().toUpperCase()),
      { headers: this.basicAuthHeaders },
    );
  };

  getAggregatedOrderbook = (pair: string, depth = 20) => {
    const url = new URL(`${this.apiUrl}/api/v1/orderbook`);
    url.searchParams.append('pair', pair);
    url.searchParams.append('depth', depth.toString());
    return fetchWithValidation(
      url.toString(),
      aggregatedOrderbookSchema,
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  };

  getAvailableExchanges = () => fetchWithValidation(
    `${this.apiUrl}/api/v1/exchange/list`,
    z.string().array(),
  );

  getExchangeOrderbook = (
    pair: string,
    exchange: string,
    depth = 20,
    filterByBrokerBalances: boolean | null = null,
  ) => {
    const url = new URL(`${this.apiUrl}/api/v1/orderbook/${exchange}/${pair}`);
    url.searchParams.append('pair', pair);
    url.searchParams.append('depth', depth.toString());
    if (filterByBrokerBalances !== null) {
      url.searchParams.append('filterByBrokerBalances', filterByBrokerBalances.toString());
    }
    return fetchWithValidation(
      url.toString(),
      exchangeOrderbookSchema,
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  };

  getPairConfigs = (market: 'spot') => {
    const url = new URL(`${this.apiUrl}/api/v1/pairs/exchangeInfo`);
    url.searchParams.append('market', toUpperCase(market));

    return fetchWithValidation(
      url.toString(),
      exchangeInfoSchema,
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  }

  getPoolReserves = (
    pair: string,
    exchange: string,
  ) => {
    const url = new URL(`${this.apiUrl}/api/v1/pools/reserves/${exchange}/${pair}`);
    return fetchWithValidation(
      url.toString(),
      poolReservesSchema,
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  };

  getVersion = () => fetchWithValidation(
    `${this.apiUrl}/api/v1/version`,
    z.object({
      serviceName: z.string(),
      version: z.string(),
      apiVersion: z.string(),
    }),
    { headers: this.basicAuthHeaders },
    errorSchema,
  );

  getPairConfig = (assetPair: string) => fetchWithValidation(
    `${this.apiUrl}/api/v1/pairs/exchangeInfo/${assetPair}`,
    pairConfigSchema,
    { headers: this.basicAuthHeaders },
    errorSchema,
  );

  checkWhitelisted = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/v1/whitelist/check?address=${address}`,
    z.boolean(),
    { headers: this.basicAuthHeaders },
    errorSchema,
  );

  placeOrder = (
    signedOrder: SignedOrder,
    isCreateInternalOrder: boolean,
    isReversedOrder?: boolean,
    partnerId?: string,
    fromWidget?: boolean,
    source?: string,
    rawExchangeRestrictions?: string | undefined,
  ) => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(isReversedOrder !== undefined) && {
        'X-Reverse-Order': isReversedOrder ? 'true' : 'false',
      },
      ...(partnerId !== undefined) && { 'X-Partner-Id': partnerId },
      ...(fromWidget !== undefined) && { 'X-From-Widget': fromWidget ? 'true' : 'false' },
      ...(source !== undefined) && { 'X-Source': source },
      ...this.basicAuthHeaders,
    };

    const url = new URL(`${this.apiUrl}/api/v1/order/${isCreateInternalOrder ? 'internal' : ''}`);

    return fetchWithValidation(
      url.toString(),
      z.object({
        orderId: z.string(),
        placementRequests: z.array(
          z.object({
            amount: z.number(),
            brokerAddress: z.string(),
            exchange: z.string(),
          }),
        ).optional(),
      }),
      {
        headers,
        method: 'POST',
        body: JSON.stringify({ ...signedOrder, rawExchangeRestrictions }),
      },
      errorSchema,
    );
  };

  cancelOrder = (signedCancelOrderRequest: SignedCancelOrderRequest) => fetchWithValidation(
    `${this.apiUrl}/api/v1/order`,
    cancelOrderSchema,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.basicAuthHeaders,
      },
      body: JSON.stringify({
        ...signedCancelOrderRequest,
        sender: signedCancelOrderRequest.senderAddress,
      }),
    },
    errorSchema,
  );

  getSwapInfo = (
    type: 'exactSpend' | 'exactReceive',
    assetIn: string,
    assetOut: string,
    amount: string,
    instantSettlement?: boolean,
    exchanges?: string[] | 'cex' | 'pools',
  ) => {
    const url = new URL(`${this.apiUrl}/api/v1/swap`);
    url.searchParams.append('assetIn', assetIn);
    url.searchParams.append('assetOut', assetOut);
    if (type === 'exactSpend') {
      url.searchParams.append('amountIn', amount);
    } else {
      url.searchParams.append('amountOut', amount);
    }
    if (exchanges !== undefined) {
      if (Array.isArray(exchanges)) {
        exchanges.forEach((exchange) => {
          url.searchParams.append('exchanges', exchange);
        });
      } else {
        url.searchParams.append('exchanges', exchanges);
      }
    }
    if (instantSettlement !== undefined && instantSettlement) {
      url.searchParams.append('instantSettlement', 'true');
    }

    return fetchWithValidation(
      url.toString(),
      swapInfoSchema,
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  };

  getPrices = (assetPair: string, includePools: boolean) => {
    const url = new URL(`${this.apiUrl}/api/v1/prices/`);
    url.searchParams.append('assetPair', assetPair);
    url.searchParams.append('includePools', includePools.toString());
    return fetchWithValidation(
      url.toString(),
      z.number(),
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  };

  getLockedBalance = (address: string, currency: string) => {
    const url = new URL(`${this.apiUrl}/api/v1/address/balance/reserved/${currency}`);
    url.searchParams.append('address', address);
    return fetchWithValidation(
      url.toString(),
      z.object({
        [currency]: z.number(),
      }).partial(),
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  };

  getTradeProfits = (
    symbol: string,
    amount: BigNumber,
    isBuy: boolean,
  ) => {
    const url = new URL(`${this.apiUrl}/api/v1/orderBenefits`);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('amount', amount.toString());
    url.searchParams.append('side', isBuy ? 'buy' : 'sell');

    return fetchWithValidation(
      url.toString(),
      orderBenefitsSchema,
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  };

  /**
   * Placing atomic swap. Placement must take place on the target chain.
   * @param secretHash Secret hash
   * @param sourceNetworkCode uppercase, e.g. BSC, ETH
   * @returns Fetch promise
   */
  placeAtomicSwap = (
    secretHash: string,
    sourceNetworkCode: Uppercase<typeof networkCodes[number]>,
  ) => fetchWithValidation(
    `${this.apiUrl}/api/v1/atomic-swap`,
    placeAtomicSwapSchema,
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.basicAuthHeaders,
      },
      method: 'POST',
      body: JSON.stringify({
        secretHash,
        sourceNetworkCode,
      }),
    },
    errorSchema,
  );

  /**
   * Get placed atomic swaps. Each atomic swap received from this list has a target chain corresponding to this Aggregator
   * @param sender Sender address
   * @returns Fetch promise
   */
  getHistoryAtomicSwaps = (sender: string, limit = 1000) => {
    const url = new URL(`${this.apiUrl}/api/v1/atomic-swap/history/all`);
    url.searchParams.append('sender', sender);
    url.searchParams.append('limit', limit.toString());
    return fetchWithValidation(url.toString(), atomicSwapHistorySchema, { headers: this.basicAuthHeaders });
  };
}
export * as schemas from './schemas/index.js';
export * as ws from './ws/index.js';
export { Aggregator };
