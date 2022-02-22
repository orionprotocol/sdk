import BigNumber from 'bignumber.js';
import { z } from 'zod';
import fetchJsonWithValidation from '../../fetchWithValidation';
import swapInfoSchema from './schemas/swapInfoSchema';
import exchangeInfoSchema from './schemas/exchangeInfoSchema';
import cancelOrderSchema from './schemas/cancelOrderSchema';
import orderBenefitsSchema from './schemas/orderBenefitsSchema';
import errorSchema from './errorSchema';
import placeAtomicSwapSchema from './schemas/placeAtomicSwapSchema';
import { OrionAggregatorWS } from './ws';
import { SupportedChainId } from '../../constants/chains';
import atomicSwapHistorySchema from './schemas/atomicSwapHistorySchema';
import { SignedCancelOrderRequest, SignedOrder } from '../../types';

class OrionAggregator {
  private apiUrl: string;

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

  getExchangeInfo() {
    return fetchJsonWithValidation(
      `${this.aggregatorUrl}/api/v1/pairs/exchangeInfo`,
      exchangeInfoSchema,
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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (partnerId) {
      headers['X-Partner-Id'] = partnerId;
    }

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

  getOrderExecutionInfo(
    spendingAsset: string,
    receivingAsset: string,
    spendingAssetAmount: string,
  ) {
    const url = new URL(`${this.aggregatorUrl}/api/v1/swap`);
    url.searchParams.append('assetIn', spendingAsset || '');
    url.searchParams.append('assetOut', receivingAsset || '');
    url.searchParams.append('amountIn', spendingAssetAmount);

    return fetchJsonWithValidation(
      url.toString(),
      swapInfoSchema,
      undefined,
      errorSchema,
    );
  }

  getLockedBalance(walletAddress: string, currency: string) {
    const url = `${this.aggregatorUrl}/api/v1/address/balance/reserved/${currency}?address=${walletAddress}`;
    return fetchJsonWithValidation(
      url,
      z.record(z.number()),
      undefined,
      errorSchema,
    );
  }

  getTradeProfits(
    symbol: string,
    amount: BigNumber,
    isBuy: boolean,
  ) {
    return fetchJsonWithValidation(
      `${this.aggregatorUrl}/api/v1/orderBenefits`
        + `?symbol=${symbol}`
        + `&amount=${amount.toString()}`
        + `&side=${isBuy ? 'buy' : 'sell'}`,
      orderBenefitsSchema,
      undefined,
      errorSchema,
    );
  }

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

  getHistoryAtomicSwaps(sender: string) {
    const url = new URL(`${this.aggregatorUrl}/api/v1/atomic-swap/history/all`);
    url.searchParams.append('limit', '1000');
    url.searchParams.append('sender', sender);
    return fetchJsonWithValidation(url.toString(), atomicSwapHistorySchema);
  }
}
export * as schemas from './schemas';
export * as ws from './ws';
export { OrionAggregator };
