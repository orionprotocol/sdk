import BigNumber from 'bignumber.js';
import { z } from 'zod';
import { fetchJsonWithValidation } from '../../fetchWithValidation';
import swapInfoSchema from './schemas/swapInfoSchema';
import exchangeInfoSchema from './schemas/exchangeInfoSchema';
import cancelOrderSchema from './schemas/cancelOrderSchema';
import orderBenefitsSchema from './schemas/orderBenefitsSchema';
import errorSchema from './errorSchema';
import placeAtomicSwapSchema from './schemas/placeAtomicSwapSchema';
import { OrionAggregatorWS } from './ws';
import atomicSwapHistorySchema from './schemas/atomicSwapHistorySchema';
import { SignedCancelOrderRequest, SignedOrder, SupportedChainId } from '../../types';
import { pairConfigSchema } from './schemas';

class OrionAggregator {
  private readonly apiUrl: string;

  readonly ws: OrionAggregatorWS;

  constructor(apiUrl: string, chainId: SupportedChainId) {
    this.apiUrl = apiUrl;
    this.ws = new OrionAggregatorWS(this.aggregatorWSUrl, chainId);
  }

  get aggregatorWSUrl() { return `wss://${this.apiUrl}/v1`; }

  get aggregatorUrl() {
    return `https://${this.apiUrl}/backend`;
  }

  getPairsList() {
    return fetchJsonWithValidation(
      `${this.aggregatorUrl}/api/v1/pairs/list`,
      z.array(z.string()),
    );
  }

  getPairConfigs() {
    return fetchJsonWithValidation(
      `${this.aggregatorUrl}/api/v1/pairs/exchangeInfo`,
      exchangeInfoSchema,
      undefined,
      errorSchema,
    );
  }

  getPairConfig(assetPair: string) {
    return fetchJsonWithValidation(
      `${this.aggregatorUrl}/api/v1/pairs/exchangeInfo/${assetPair}`,
      pairConfigSchema,
      undefined,
      errorSchema,
    );
  }

  checkWhitelisted(address: string) {
    return fetchJsonWithValidation(
      `${this.aggregatorUrl}/api/v1/whitelist/check?address=${address}`,
      z.boolean(),
      undefined,
      errorSchema,
    );
  }

  placeOrder(
    signedOrder: SignedOrder,
    isCreateInternalOrder: boolean,
    partnerId?: string,
  ) {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...partnerId && { 'X-Partner-Id': partnerId },
    };

    return fetchJsonWithValidation(
      `${this.aggregatorUrl}/api/v1/order/${isCreateInternalOrder ? 'internal' : ''}`,
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
        body: JSON.stringify(signedOrder),
      },
      errorSchema,
    );
  }

  cancelOrder(signedCancelOrderRequest: SignedCancelOrderRequest) {
    return fetchJsonWithValidation(
      `${this.aggregatorUrl}/api/v1/order`,
      cancelOrderSchema,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...signedCancelOrderRequest,
          sender: signedCancelOrderRequest.senderAddress,
        }),
      },
      errorSchema,
    );
  }

  getSwapInfo(
    type: 'exactSpend' | 'exactReceive',
    assetIn: string,
    assetOut: string,
    amount: string,
  ) {
    const url = new URL(`${this.aggregatorUrl}/api/v1/swap`);
    url.searchParams.append('assetIn', assetIn);
    url.searchParams.append('assetOut', assetOut);
    if (type === 'exactSpend') {
      url.searchParams.append('amountIn', amount);
    } else {
      url.searchParams.append('amountOut', amount);
    }

    return fetchJsonWithValidation(
      url.toString(),
      swapInfoSchema,
      undefined,
      errorSchema,
    );
  }

  getLockedBalance(address: string, currency: string) {
    const url = new URL(`${this.aggregatorUrl}/api/v1/address/balance/reserved/${currency}`);
    url.searchParams.append('address', address);
    return fetchJsonWithValidation(
      url.toString(),
      z.object({
        [currency]: z.number(),
      }).partial(),
      undefined,
      errorSchema,
    );
  }

  getTradeProfits(
    symbol: string,
    amount: BigNumber,
    isBuy: boolean,
  ) {
    const url = new URL(`${this.aggregatorUrl}/api/v1/orderBenefits`);
    url.searchParams.append('symbol', symbol);
    url.searchParams.append('amount', amount.toString());
    url.searchParams.append('side', isBuy ? 'buy' : 'sell');

    return fetchJsonWithValidation(
      url.toString(),
      orderBenefitsSchema,
      undefined,
      errorSchema,
    );
  }

  /**
   * Placing atomic swap. Placement must take place on the target chain.
   * @param secretHash Secret hash
   * @param sourceNetworkCode uppercase, e.g. BSC, ETH
   * @returns Fetch promise
   */
  placeAtomicSwap(
    secretHash: string,
    sourceNetworkCode: string,
  ) {
    return fetchJsonWithValidation(
      `${this.aggregatorUrl}/api/v1/atomic-swap`,
      placeAtomicSwapSchema,
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          secretHash,
          sourceNetworkCode,
        }),
      },
      errorSchema,
    );
  }

  /**
   * Get placed atomic swaps. Each atomic swap received from this list has a target chain corresponding to this Orion Aggregator
   * @param sender Sender address
   * @returns Fetch promise
   */
  getHistoryAtomicSwaps(sender: string, limit = 1000) {
    const url = new URL(`${this.aggregatorUrl}/api/v1/atomic-swap/history/all`);
    url.searchParams.append('sender', sender);
    url.searchParams.append('limit', limit.toString());
    return fetchJsonWithValidation(url.toString(), atomicSwapHistorySchema);
  }
}
export * as schemas from './schemas';
export * as ws from './ws';
export { OrionAggregator };
