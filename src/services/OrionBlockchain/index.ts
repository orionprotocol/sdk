import { z } from 'zod';
import { fetchJsonWithValidation } from '../../fetchWithValidation';
import { PairStatusEnum, pairStatusSchema } from './schemas/adminPoolsListSchema';
import {
  IDOSchema, atomicHistorySchema, balancesSchema,
  poolsConfigSchema, poolsInfoSchema, infoSchema, historySchema,
  addPoolSchema, adminPoolsListSchema,
} from './schemas';
import OrionBlockchainBalancesSocketIO from './balancesSocketIO';
import { SupportedChainId } from '../../constants/chains';
import redeemOrderSchema from '../OrionAggregator/schemas/redeemOrderSchema';

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

class OrionBlockchain {
  private apiUrl: string;

  readonly balancesWs: OrionBlockchainBalancesSocketIO;

  constructor(
    apiUrl: string,
    chainId: SupportedChainId,
    wsMessageCb: (data: z.infer<typeof balancesSchema>) => void,
  ) {
    this.apiUrl = apiUrl;
    this.balancesWs = new OrionBlockchainBalancesSocketIO(
      `https://${apiUrl}/`,
      wsMessageCb,
    );
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
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/prices`, z.record(z.string()));
  }

  getTokensFee() {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/tokensFee`, z.record(z.string()));
  }

  getGasPriceGwei() {
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

  checkRedeem(secretHash: string) {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/atomic/matcher-redeem/${secretHash}`, z.string().nullable());
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

  getAtomicSourceNetworkHistory(address: string) {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/atomic/history/?sender=${address}&limit=1000`, atomicHistorySchema);
  }

  getAtomicTargetNetworkHistory(address: string) {
    return fetchJsonWithValidation(`https://${this.apiUrl}/api/atomic/history/?receiver=${address}&limit=1000`, atomicHistorySchema);
  }

  checkIfHashUsed(secretHashes: string[]) {
    return fetchJsonWithValidation(
      `https://${this.apiUrl}/api/atomic/is-hash-used`,
      z.record(z.boolean()),
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

export * as schemas from './schemas';
export { OrionBlockchain };
