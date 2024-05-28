import type { BigNumber } from 'bignumber.js';
import { z } from 'zod';
import swapInfoSchema from './schemas/swapInfoSchema.js';
import exchangeInfoSchema from './schemas/exchangeInfoSchema.js';
import cancelOrderSchema from './schemas/cancelOrderSchema.js';
import orderBenefitsSchema from './schemas/orderBenefitsSchema.js';
import errorSchema from './schemas/errorSchema.js';
import placeAtomicSwapSchema from './schemas/placeAtomicSwapSchema.js';
import { AggregatorWS } from './ws';
import { atomicSwapHistorySchema } from './schemas/atomicSwapHistorySchema.js';
import type {
  BasicAuthCredentials,
  OrderSource,
  NetworkShortName,
  SignedLockOrder,
  SignedCancelOrderRequest,
  SignedOrder
} from '../../types.js';
import {
  pairConfigSchema, aggregatedOrderbookSchema,
  exchangeOrderbookSchema, poolReservesSchema,
} from './schemas/index.js';
import toUpperCase from '../../utils/toUpperCase.js';
import httpToWS from '../../utils/httpToWS.js';
import { ethers } from 'ethers';
import orderSchema from './schemas/orderSchema.js';
import { fetchWithValidation } from 'simple-typed-fetch';
import { pmmOrderSchema } from '../../Unit/Pmm/schemas/order';
//  import hmacSHA256 from "crypto-js/hmac-sha256";
//  import Hex from "crypto-js/enc-hex";
// const crypto = require('crypto')

class Aggregator {
  private readonly apiUrl: string;

  readonly ws: AggregatorWS;

  private readonly basicAuth?: BasicAuthCredentials | undefined;

  get api() {
    return this.apiUrl;
  }

  public logger: ((message: string) => void) | undefined;

  constructor(
    httpAPIUrl: string,
    wsAPIUrl: string,
    basicAuth?: BasicAuthCredentials,
    logger?: ((message: string) => void) | undefined
  ) {
    this.logger = logger;

    // const oaUrl = new URL(apiUrl);
    // const oaWsProtocol = oaUrl.protocol === 'https:' ? 'wss' : 'ws';
    // const aggregatorWsUrl = `${oaWsProtocol}://${oaUrl.host + (oaUrl.pathname === '/'
    //   ? ''
    //   : oaUrl.pathname)}/v1`;

    this.apiUrl = httpAPIUrl;
    this.ws = new AggregatorWS(httpToWS(wsAPIUrl), undefined, logger);
    this.basicAuth = basicAuth;

    this.getHistoryAtomicSwaps = this.getHistoryAtomicSwaps.bind(this);
    this.getPairConfig = this.getPairConfig.bind(this);
    this.getPairConfigs = this.getPairConfigs.bind(this);
    this.getPairsList = this.getPairsList.bind(this);
    this.getSwapInfo = this.getSwapInfo.bind(this);
    this.getCrossChainAssetsByNetwork = this.getCrossChainAssetsByNetwork.bind(this);
    this.getTradeProfits = this.getTradeProfits.bind(this);
    this.getStableCoins = this.getStableCoins.bind(this);
    this.placeAtomicSwap = this.placeAtomicSwap.bind(this);
    this.placeOrder = this.placeOrder.bind(this);
    this.placeLockOrder = this.placeLockOrder.bind(this);
    this.cancelOrder = this.cancelOrder.bind(this);
    this.checkWhitelisted = this.checkWhitelisted.bind(this);
    this.getLockedBalance = this.getLockedBalance.bind(this);
    this.getAggregatedOrderbook = this.getAggregatedOrderbook.bind(this);
    this.getExchangeOrderbook = this.getExchangeOrderbook.bind(this);
    this.getPoolReserves = this.getPoolReserves.bind(this);
    this.getVersion = this.getVersion.bind(this);
    this.getPrices = this.getPrices.bind(this);
    this.getIsCexLiquidityAvailable = this.getIsCexLiquidityAvailable.bind(this);
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
    source?: OrderSource,
    rawExchangeRestrictions?: string | undefined,
  ) => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(isReversedOrder !== undefined) && {
        'X-Reverse-Order': isReversedOrder ? 'true' : 'false',
      },
      ...(partnerId !== undefined) && { 'X-Partner-Id': partnerId },
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

  placeLockOrder = (
    signedLockOrder: SignedLockOrder,
  ) => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.basicAuthHeaders,
    };

    const url = new URL(`${this.apiUrl}/api/v1/cross-chain`);

    const body = {
      secretHash: signedLockOrder.secretHash,
      sender: signedLockOrder.sender,
      expiration: signedLockOrder.expiration,
      asset: signedLockOrder.asset,
      amount: signedLockOrder.amount,
      targetChainId: Number(signedLockOrder.targetChainId),
      sign: signedLockOrder.signature,
      secret: signedLockOrder.secret,
    }

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
        body: JSON.stringify(body),
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

  getCrossChainAssetsByNetwork = (sourceChain: NetworkShortName) => {
    const url = new URL(`${this.apiUrl}/api/v1/cross-chain/assets`);
    url.searchParams.append('sourceChain', sourceChain);

    return fetchWithValidation(
      url.toString(),
      z.array(z.string()),
      { headers: this.basicAuthHeaders },
      errorSchema,
    )
  }

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

  getStableCoins = () => {
    const url = new URL(`${this.apiUrl}/api/v1/tokens/stable/`);
    return fetchWithValidation(
      url.toString(),
      z.array(z.string()),
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
    sourceNetworkCode: NetworkShortName,
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
     * @param limit
     * @returns Fetch promise
     */
  getHistoryAtomicSwaps = (sender: string, limit = 1000) => {
    const url = new URL(`${this.apiUrl}/api/v1/atomic-swap/history/all`);
    url.searchParams.append('sender', sender);
    url.searchParams.append('limit', limit.toString());
    return fetchWithValidation(url.toString(), atomicSwapHistorySchema, { headers: this.basicAuthHeaders });
  };

  getIsCexLiquidityAvailable = (
    assetIn: string,
    assetOut: string,
  ) => {
    const url = new URL(`${this.apiUrl}/api/v1/pairs/cex/liquidity/${assetIn}/${assetOut}`);

    return fetchWithValidation(
      url.toString(),
      z.boolean(),
      { headers: this.basicAuthHeaders },
      errorSchema,
    );
  };

  // private encode_utf8(s: string) {
  //   return unescape(encodeURIComponent(s));
  // }

  // @ts-expect-error: TODO: please remove this line!
  private sign(message: string, key: string) {
    // return crypto.createHmac('sha256', this.encode_utf8(key))
    //   .update(this.encode_utf8(message))
    //   .digest('hex');
    return '';
  }

  private generateHeaders(body: any, method: string, path: string, timestamp: number, apiKey: string, secretKey: string) {
    const sortedBody = Object.keys(body)
      .sort()
      .map((key) => (
        `${key}=${body[key]}`
      )).join('&');

    const payload = timestamp + method.toUpperCase() + path + sortedBody;

    const signature = this.sign(payload, secretKey);

    const httpOptions = {
      headers: {
        'API-KEY': apiKey,
        'ACCESS-TIMESTAMP': timestamp.toString(),
        'ACCESS-SIGN': signature
      }
    };
    return httpOptions;
  }

  public async RFQOrder(
    tokenFrom: string,
    tokenTo: string,
    fromTokenAmount: string,
    apiKey: string, //
    secretKey: string,
    wallet: string
  ): Promise<z.infer<typeof pmmOrderSchema>> {
    //  Making the order structure
    const
      path = '/rfq';
    const url = `${this.apiUrl}/api/v1/integration/pmm` + path;
    const headers = {
      'Content-Type': 'application/json',
    };
    const data = {
      baseToken: tokenFrom, // USDT
      quoteToken: tokenTo, // ORN
      amount: fromTokenAmount, // 100
      taker: wallet,
      feeBps: 0
    };
    const method = 'POST';
    const timestamp = Date.now();
    const signatureHeaders = this.generateHeaders(data, method, path, timestamp, apiKey, secretKey);
    const compiledHeaders = { ...headers, ...signatureHeaders.headers, };
    const body = JSON.stringify(data)
        ;

    const res = pmmOrderSchema.parse({});

    try {
      const result = await fetch(url, {
        headers: compiledHeaders,
        method,
        body
      });

      const json = await result.json();
      const parseResult = pmmOrderSchema.safeParse(json);

      if (!parseResult.success) {
        //  Try to parse error answer
        const errorSchema = z.object({ error: z.object({ code: z.number(), reason: z.string() }) });

        const errorParseResult = errorSchema.safeParse(json);

        if (!errorParseResult.success) {
          throw Error(`Unrecognized answer from aggregator: ${json}`);
        }

        throw Error(errorParseResult.data.error.reason);
      }

      res.order = parseResult.data.order;
      res.signature = parseResult.data.signature;
      res.error = '';
      res.success = true;
      //  return result;
    } catch (err) {
      res.error = `${err}`;
    }
    return res;
  }
}

export * as schemas from './schemas/index.js';
export * as ws from './ws/index.js';
export { Aggregator };
