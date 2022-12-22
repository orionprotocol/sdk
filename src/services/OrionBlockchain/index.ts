import { z } from 'zod';
import fetchWithValidation from '../../fetchWithValidation';
import {
  IDOSchema, atomicHistorySchema,
  poolsConfigSchema, poolsInfoSchema, infoSchema, historySchema,
  addPoolSchema, adminPoolsListSchema, adminPoolSchema,
  atomicSummarySchema,
  poolsLpAndStakedSchema,
  userVotesSchema,
  userEarnedSchema,
  PairStatusEnum,
  pairStatusSchema,
} from './schemas';
import redeemOrderSchema from '../OrionAggregator/schemas/redeemOrderSchema';
import { sourceAtomicHistorySchema, targetAtomicHistorySchema } from './schemas/atomicHistorySchema';
import { makePartial } from '../../utils';
import { networkCodes } from '../../constants';

interface IAdminAuthHeaders {
  auth: string;
  [key: string]: string
}

export interface IEditPool {
  tokenAIcon?: string;
  tokenBIcon?: string;
  symbol?: string;
  status: PairStatusEnum;
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
  sourceNetworkCode?: 'ftm' | 'bsc' | 'eth' | 'polygon' | 'okc',
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

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;

    this.getAtomicSwapAssets = this.getAtomicSwapAssets.bind(this);
    this.getAtomicSwapHistory = this.getAtomicSwapHistory.bind(this);
    this.getAuthToken = this.getAuthToken.bind(this);
    this.getCirculatingSupply = this.getCirculatingSupply.bind(this);
    this.getInfo = this.getInfo.bind(this);
    this.getPoolsConfig = this.getPoolsConfig.bind(this);
    this.getPoolsInfo = this.getPoolsInfo.bind(this);
    this.getPoolsLpAndStaked = this.getPoolsLpAndStaked.bind(this);
    this.getUserVotes = this.getUserVotes.bind(this);
    this.getUserEarned = this.getUserEarned.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getPrices = this.getPrices.bind(this);
    this.getTokensFee = this.getTokensFee.bind(this);
    this.getGasPriceWei = this.getGasPriceWei.bind(this);
    this.checkFreeRedeemAvailable = this.checkFreeRedeemAvailable.bind(this);
    this.redeemAtomicSwap = this.redeemAtomicSwap.bind(this);
    this.redeem2AtomicSwaps = this.redeem2AtomicSwaps.bind(this);
    this.checkRedeem = this.checkRedeem.bind(this);
    this.checkRedeem2Atomics = this.checkRedeem2Atomics.bind(this);
    this.getIDOInfo = this.getIDOInfo.bind(this);
    this.checkAuth = this.checkAuth.bind(this);
    this.addPool = this.addPool.bind(this);
    this.editPool = this.editPool.bind(this);
    this.getPool = this.getPool.bind(this);
    this.getPoolsList = this.getPoolsList.bind(this);
    this.getSourceAtomicSwapHistory = this.getSourceAtomicSwapHistory.bind(this);
    this.getTargetAtomicSwapHistory = this.getTargetAtomicSwapHistory.bind(this);
    this.checkPoolInformation = this.checkPoolInformation.bind(this);
    this.checkIfHashUsed = this.checkIfHashUsed.bind(this);
    this.getBlockNumber = this.getBlockNumber.bind(this);
    this.getRedeemOrderBySecretHash = this.getRedeemOrderBySecretHash.bind(this);
    this.claimOrder = this.claimOrder.bind(this);
  }

  get orionBlockchainWsUrl() {
    return `${this.apiUrl}/`;
  }

  private getSummaryRedeem = (brokerAddress: string, unshifted?: 1 | 0, sourceNetworkCode?: typeof networkCodes[number]) => {
    const url = new URL(`${this.apiUrl}/api/atomic/summary-redeem/${brokerAddress}`);
    if (unshifted) {
      url.searchParams.append('unshifted', unshifted.toString());
    }
    if (sourceNetworkCode) {
      url.searchParams.append('sourceNetworkCode', sourceNetworkCode);
    }
    return fetchWithValidation(
      url.toString(),
      atomicSummarySchema,
    );
  };

  private getSummaryClaim = (brokerAddress: string) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/summary-claim/${brokerAddress}`,
    atomicSummarySchema,
  );

  private getQueueLength = () => fetchWithValidation(
    `${this.apiUrl}/api/queueLength`,
    z.number().int(),
  );

  get internal() {
    return {
      getSummaryRedeem: this.getSummaryRedeem.bind(this),
      getSummaryClaim: this.getSummaryClaim.bind(this),
      getQueueLength: this.getQueueLength.bind(this),
    };
  }

  getAuthToken = () => fetchWithValidation(
    `${this.apiUrl}/api/auth/token`,
    z.object({ token: z.string() }),
  );

  getCirculatingSupply = () => fetchWithValidation(
    `${this.apiUrl}/api/circulating-supply`,
    z.number(),
  );

  getInfo = () => fetchWithValidation(`${this.apiUrl}/api/info`, infoSchema);

  getPoolsConfig = () => fetchWithValidation(
    `${this.apiUrl}/api/pools/config`,
    poolsConfigSchema,
  );

  getPoolsInfo = () => fetchWithValidation(
    `${this.apiUrl}/api/pools/info`,
    poolsInfoSchema,
  );

  getPoolsLpAndStaked = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/pools/user-lp/${address}`,
    poolsLpAndStakedSchema,
  );

  getUserVotes = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/pools/user-votes/${address}`,
    userVotesSchema,
  );

  getUserEarned = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/pools/user-earned/${address}`,
    userEarnedSchema,
  );

  getHistory = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/history/${address}`,
    historySchema,
  );

  getPrices = () => fetchWithValidation(
    `${this.apiUrl}/api/prices`,
    z.record(z.string()).transform(makePartial),
  );

  getTokensFee = () => fetchWithValidation(
    `${this.apiUrl}/api/tokensFee`,
    z.record(z.string()).transform(makePartial),
  );

  getGasPriceWei = () => fetchWithValidation(
    `${this.apiUrl}/api/gasPrice`,
    z.string(),
  );

  checkFreeRedeemAvailable = (walletAddress: string) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/has-free-redeem/${walletAddress}`,
    z.boolean(),
  );

  getRedeemOrderBySecretHash = (secretHash: string) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/redeem-order/${secretHash}`,
    z.object({
      secretHash: z.string(),
      secret: z.string(),
      redeemTxHash: z.string(),
    }),
  );

  claimOrder = (
    secretHash: string,
    targetNetwork: typeof networkCodes[number],
    redeemTxHash?: string,
  ) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/claim-order`,
    z.string(),
    {
      method: 'POST',
      body: JSON.stringify({
        secretHash,
        targetNetwork,
        redeemTxHash,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  redeemAtomicSwap = (
    redeemOrder: z.infer<typeof redeemOrderSchema>,
    secret: string,
    sourceNetwork: typeof networkCodes[number],
  ) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/matcher-redeem`,
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

  redeem2AtomicSwaps = (
    redeemOrder1: z.infer<typeof redeemOrderSchema>,
    secret1: string,
    redeemOrder2: z.infer<typeof redeemOrderSchema>,
    secret2: string,
    sourceNetwork: typeof networkCodes[number],
  ) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/matcher-redeem2atomics`,
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

  checkRedeem = (secretHash: string) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/matcher-redeem/${secretHash}`,
    z.enum(['OK', 'FAIL']).nullable(),
  );

  checkRedeem2Atomics = (firstSecretHash: string, secondSecretHash: string) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/matcher-redeem/${firstSecretHash}-${secondSecretHash}`,
    z.enum(['OK', 'FAIL']).nullable(),
  );

  getBlockNumber = () => fetchWithValidation(`${this.apiUrl}/api/blocknumber`, z.number().int());

  getIDOInfo = () => fetchWithValidation(`${this.apiUrl}/api/solarflare`, IDOSchema);

  checkAuth = (headers: IAdminAuthHeaders) => fetchWithValidation(`${this.apiUrl}/api/auth/check`, z.object({
    auth: z.boolean(),
  }), { headers });

  getPool = (address: string, headers: IAdminAuthHeaders) => fetchWithValidation(
    `${this.apiUrl}/api/pools/${address}`,
    adminPoolSchema,
    { headers },
  );

  getPoolsList = (headers: IAdminAuthHeaders) => fetchWithValidation(
    `${this.apiUrl}/api/pools/list`,
    adminPoolsListSchema,
    { headers },
  );

  editPool = (address: string, data: IEditPool, headers: IAdminAuthHeaders) => fetchWithValidation(
    `${this.apiUrl}/api/pools/edit/${address}`,
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

  addPool = (data: z.infer<typeof addPoolSchema>) => fetchWithValidation(
    `${this.apiUrl}/api/pools/add`,
    z.number(),
    {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
    z.string(),
  );

  checkPoolInformation = (poolAddress: string) => fetchWithValidation(
    `${this.apiUrl}/api/pools/check/${poolAddress}`,
    pairStatusSchema,
  );

  getAtomicSwapAssets = () => fetchWithValidation(
    `${this.apiUrl}/api/atomic/swap-assets`,
    z.array(z.string()),
  );

  /**
   * Sender is user address in source Orion Blockchain instance \
   * Receiver is user address in target Orion Blockchain instance
   */
  getAtomicSwapHistory = (query: AtomicSwapHistorySourceQuery | AtomicSwapHistoryTargetQuery) => {
    const url = new URL(`${this.apiUrl}/api/atomic/history/`);

    Object.entries(query)
      .forEach(([key, value]) => url.searchParams.append(key, value.toString()));

    return fetchWithValidation(url.toString(), atomicHistorySchema);
  };

  getSourceAtomicSwapHistory = (query: AtomicSwapHistorySourceQuery) => {
    const url = new URL(`${this.apiUrl}/api/atomic/history/`);

    Object.entries(query)
      .forEach(([key, value]) => url.searchParams.append(key, value.toString()));

    if (!query.type) url.searchParams.append('type', 'source');

    return fetchWithValidation(url.toString(), sourceAtomicHistorySchema);
  };

  getTargetAtomicSwapHistory = (query: AtomicSwapHistoryTargetQuery) => {
    const url = new URL(`${this.apiUrl}/api/atomic/history/`);

    Object.entries(query)
      .forEach(([key, value]) => url.searchParams.append(key, value.toString()));

    if (!query.type) url.searchParams.append('type', 'target');

    return fetchWithValidation(url.toString(), targetAtomicHistorySchema);
  };

  checkIfHashUsed = (secretHashes: string[]) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/is-hash-used`,
    z.record(z.boolean()).transform(makePartial),
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

export * as schemas from './schemas';
export { OrionBlockchain };
