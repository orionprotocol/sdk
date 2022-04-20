import { z } from 'zod';
import { fetchJsonWithValidation } from '../../fetchWithValidation';
import { PairStatusEnum, pairStatusSchema } from './schemas/adminPoolsListSchema';
import {
  IDOSchema, atomicHistorySchema,
  poolsConfigSchema, poolsInfoSchema, infoSchema, historySchema,
  addPoolSchema, adminPoolsListSchema,
} from './schemas';
import { OrionBlockchainSocketIO } from './ws';
import redeemOrderSchema from '../OrionAggregator/schemas/redeemOrderSchema';
import { sourceAtomicHistorySchema, targetAtomicHistorySchema } from './schemas/atomicHistorySchema';
import { SupportedChainId } from '../../types';
import { utils } from '../..';

interface IAdminAuthHeaders {
  auth: string;
  [key: string]: string
}

export interface IEditPool {
  tokenAIcon?: string;
  tokenBIcon?: string;
  symbol?: string;
  status: PairStatusEnum;
  qtyPrecision?: number;
  pricePrecision?: number;
  minQty?: number;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  tokensReversed?: boolean;
}

type AtomicSwapHistoryBaseQuery = {
  limit?: number
  sender?: string,
  receiver?: string,
  used?: 0 | 1,
  page?: number,
}

type AtomicSwapHistorySourceQuery = AtomicSwapHistoryBaseQuery & {
  type?: 'source',
  expiredLock?: 0 | 1,
  state?: 'LOCKED' | 'CLAIMED' |'REFUNDED',

}
type AtomicSwapHistoryTargetQuery = AtomicSwapHistoryBaseQuery & {
  type?: 'target',
  expiredRedeem?: 0 | 1,
  state?: 'REDEEMED' | 'BEFORE-REDEEM',
}
class OrionBlockchain {
  private readonly apiUrl: string;

  readonly ws: OrionBlockchainSocketIO;

  constructor(
    apiUrl: string,
    chainId: SupportedChainId,
  ) {
    this.apiUrl = apiUrl;
    this.ws = new OrionBlockchainSocketIO(`https://${apiUrl}/`);
  }

  get orionBlockchainWsUrl() {
    return `https://${this.apiUrl}/`;
  }

  getAuthToken() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/auth/token`, z.object({ token: z.string() }));
  }

  getCirculatingSupply() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/circulating-supply`, z.number());
  }

  getInfo() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/info`, infoSchema);
  }

  getPoolsConfig() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/pools/config`, poolsConfigSchema);
  }

  getPoolsInfo() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/pools/info`, poolsInfoSchema);
  }

  getHistory(address: string) {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/history/${address}`, historySchema);
  }

  getPrices() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/prices`, z.record(z.string()).transform(utils.makePartial));
  }

  getTokensFee() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/tokensFee`, z.record(z.string()).transform(utils.makePartial));
  }

  getGasPriceWei() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/gasPrice`, z.string());
  }

  checkFreeRedeemAvailable(walletAddress: string) {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/atomic/has-free-redeem/${walletAddress}`, z.boolean());
  }

  redeemAtomicSwap(
    redeemOrder: z.infer<typeof redeemOrderSchema>,
    secret: string,
    sourceNetwork: string,
  ) {
    return fetchJsonWithValidation(
      `https://${this.apiUrl}/api/atomic/matcher-redeem`,
      z.string(),
      {
        method: 'POST',
        body: JSON.stringify({
          order: redeemOrder,
          secret,
          sourceNetwork,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  redeem2AtomicSwaps(
    redeemOrder1: z.infer<typeof redeemOrderSchema>,
    secret1: string,
    redeemOrder2: z.infer<typeof redeemOrderSchema>,
    secret2: string,
    sourceNetwork: string,
  ) {
    return fetchJsonWithValidation(
      `https://${this.apiUrl}/api/atomic/matcher-redeem2atomics`,
      z.string(),
      {
        method: 'POST',
        body: JSON.stringify({
          order1: redeemOrder1,
          secret1,
          order2: redeemOrder2,
          secret2,
          sourceNetwork,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  checkRedeem(secretHash: string) {
    return fetchJsonWithValidation(
      `https://${this.apiUrl}/api/atomic/matcher-redeem/${secretHash}`,
      z.enum(['OK', 'FAIL']).nullable(),
    );
  }

  checkRedeem2Atomics(firstSecretHash: string, secondSecretHash: string) {
    return fetchJsonWithValidation(
      `https://${this.apiUrl}/api/atomic/matcher-redeem/${firstSecretHash}-${secondSecretHash}`,
      z.enum(['OK', 'FAIL']).nullable(),
    );
  }

  getIDOInfo() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/solarflare`, IDOSchema);
  }

  checkAuth(headers: IAdminAuthHeaders) {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/auth/check`, z.object({
      auth: z.boolean(),
    }), { headers });
  }

  getPoolsList(headers: IAdminAuthHeaders) {
    return fetchJsonWithValidation(
      `https://${this.apiUrl}/api/pools/list`,
      adminPoolsListSchema,
      { headers },
    );
  }

  editPool(address: string, data: IEditPool, headers: IAdminAuthHeaders) {
    return fetchJsonWithValidation(
      `https://${this.apiUrl}/api/pools/edit/${address}`,
      pairStatusSchema,
      {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      },
    );
  }

  addPool(data: z.infer<typeof addPoolSchema>) {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/pools/add`, z.number(), {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  checkPoolInformation(poolAddress: string) {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/pools/check/${poolAddress}`, pairStatusSchema);
  }

  getAtomicSwapAssets() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/atomic/swap-assets`, z.array(z.string()));
  }

  /**
   * Sender is user address in source Orion Blockchain instance \
   * Receiver is user address in target Orion Blockchain instance
   */
  getAtomicSwapHistory(query: AtomicSwapHistorySourceQuery | AtomicSwapHistoryTargetQuery) {
    const url = new URL(`https://${this.apiUrl}/api/atomic/history/`);

    Object.entries(query)
      .forEach(([key, value]) => url.searchParams.append(key, value.toString()));

    return fetchJsonWithValidation(url.toString(), atomicHistorySchema);
  }

  getSourceAtomicSwapHistory(query: AtomicSwapHistorySourceQuery) {
    const url = new URL(`https://${this.apiUrl}/api/atomic/history/`);

    Object.entries(query)
      .forEach(([key, value]) => url.searchParams.append(key, value.toString()));

    if (!query.type) url.searchParams.append('type', 'source');

    return fetchJsonWithValidation(url.toString(), sourceAtomicHistorySchema);
  }

  getTargetAtomicSwapHistory(query: AtomicSwapHistoryTargetQuery) {
    const url = new URL(`https://${this.apiUrl}/api/atomic/history/`);

    Object.entries(query)
      .forEach(([key, value]) => url.searchParams.append(key, value.toString()));

    if (!query.type) url.searchParams.append('type', 'target');

    return fetchJsonWithValidation(url.toString(), targetAtomicHistorySchema);
  }

  checkIfHashUsed(secretHashes: string[]) {
    return fetchJsonWithValidation(
      `https://${this.apiUrl}/api/atomic/is-hash-used`,
      z.record(z.boolean()).transform(utils.makePartial),
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        method: 'POST',
        body: JSON.stringify(secretHashes),
      },
    );
  }
}

export * as ws from './ws';
export * as schemas from './schemas';
export { OrionBlockchain };
