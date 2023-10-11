import { z } from 'zod';
import {
  IDOSchema, atomicHistorySchema,
  poolsConfigSchema, poolsInfoSchema, infoSchema, historySchema,
  poolsV3InfoSchema,
  type addPoolSchema, adminPoolsListSchema, adminPoolSchema,
  atomicSummarySchema,
  poolsLpAndStakedSchema,
  userVotesSchema,
  userEarnedSchema,
  type PairStatusEnum,
  pairStatusSchema,
  governanceContractsSchema,
  governancePoolsSchema,
  governancePoolSchema,
  governanceChainsInfoSchema,
  pricesWithQuoteAssetSchema,
} from './schemas/index.js';
import type redeemOrderSchema from '../Aggregator/schemas/redeemOrderSchema.js';
import { sourceAtomicHistorySchema, targetAtomicHistorySchema } from './schemas/atomicHistorySchema.js';
import { makePartial } from '../../utils';
import type { networkCodes } from '../../constants/index.js';
import { fetchWithValidation } from 'simple-typed-fetch';
import type { BasicAuthCredentials } from '../../types.js';

type IAdminAuthHeaders = {
  auth: string
  [key: string]: string
}

export type IEditPool = {
  tokenAIcon?: string
  tokenBIcon?: string
  symbol?: string
  status: PairStatusEnum
  minQty?: number
  tokenASymbol?: string
  tokenBSymbol?: string
  tokensReversed?: boolean
}

type AtomicSwapHistoryBaseQuery = {
  limit?: number
  sender?: string
  receiver?: string
  used?: 0 | 1
  page?: number
  sourceNetworkCode?: typeof networkCodes[number]
} & Partial<Record<string, string | number>>

type AtomicSwapHistorySourceQuery = AtomicSwapHistoryBaseQuery & {
  type?: 'source'
  expiredLock?: 0 | 1
  state?: 'BEFORE-LOCK' | 'LOCKED' | 'CLAIMED' | 'REFUNDED'

}
type AtomicSwapHistoryTargetQuery = AtomicSwapHistoryBaseQuery & {
  type?: 'target'
  expiredRedeem?: 0 | 1
  state?: 'REDEEMED' | 'BEFORE-REDEEM'
}

type PlatformFees = {
  assetIn: string
  assetOut: string
  walletAddress?: string | undefined
  fromWidget?: string | undefined
}
class BlockchainService {
  private readonly apiUrl: string;

  private readonly basicAuth?: BasicAuthCredentials | undefined;

  get api() {
    return this.apiUrl;
  }

  constructor(apiUrl: string, basicAuth?: BasicAuthCredentials) {
    this.apiUrl = apiUrl;
    this.basicAuth = basicAuth;

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
    this.getPoolsV3Info = this.getPoolsV3Info.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getPricesWithQuoteAsset = this.getPricesWithQuoteAsset.bind(this);
    this.getTokensFee = this.getTokensFee.bind(this);
    this.getPlatformFees = this.getPlatformFees.bind(this);
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
    this.getGovernanceContracts = this.getGovernanceContracts.bind(this);
    this.getGovernancePools = this.getGovernancePools.bind(this);
    this.getGovernancePool = this.getGovernancePool.bind(this);
    this.getGovernanceChainsInfo = this.getGovernanceChainsInfo.bind(this);
  }

  get basicAuthHeaders() {
    if (this.basicAuth) {
      return {
        Authorization: `Basic ${btoa(`${this.basicAuth.username}:${this.basicAuth.password}`)}`,
      };
    }
    return {};
  }

  get blockchainServiceWsUrl() {
    return `${this.apiUrl}/`;
  }

  private readonly getSummaryRedeem = (brokerAddress: string, unshifted?: 1 | 0, sourceNetworkCode?: typeof networkCodes[number]) => {
    const url = new URL(`${this.apiUrl}/api/atomic/summary-redeem/${brokerAddress}`);
    if (unshifted !== undefined && unshifted === 1) {
      url.searchParams.append('unshifted', unshifted.toString());
    }
    if (sourceNetworkCode !== undefined) {
      url.searchParams.append('sourceNetworkCode', sourceNetworkCode);
    }
    return fetchWithValidation(
      url.toString(),
      atomicSummarySchema,
      { headers: this.basicAuthHeaders }
    );
  };

  private readonly getSummaryClaim = (brokerAddress: string) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/summary-claim/${brokerAddress}`,
    atomicSummarySchema,
    { headers: this.basicAuthHeaders },
  );

  private readonly getQueueLength = () => fetchWithValidation(
    `${this.apiUrl}/api/queueLength`,
    z.number().int(),
    { headers: this.basicAuthHeaders },
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
    { headers: this.basicAuthHeaders }
  );

  getCirculatingSupply = () => fetchWithValidation(
    `${this.apiUrl}/api/circulating-supply`,
    z.number(),
    { headers: this.basicAuthHeaders }
  );

  getInfo = () => fetchWithValidation(`${this.apiUrl}/api/info`, infoSchema);

  getPoolsConfig = () => fetchWithValidation(
    `${this.apiUrl}/api/pools/config`,
    poolsConfigSchema,
    { headers: this.basicAuthHeaders }
  );

  getPoolsInfo = () => fetchWithValidation(
    `${this.apiUrl}/api/pools/info`,
    poolsInfoSchema,
    { headers: this.basicAuthHeaders }
  );

  getPoolsLpAndStaked = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/pools/user-lp/${address}`,
    poolsLpAndStakedSchema,
    { headers: this.basicAuthHeaders }
  );

  getUserVotes = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/pools/user-votes/${address}`,
    userVotesSchema,
    { headers: this.basicAuthHeaders }
  );

  getUserEarned = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/pools/user-earned/${address}`,
    userEarnedSchema,
    { headers: this.basicAuthHeaders }
  );

  getPoolsV3Info = () => fetchWithValidation(
    `${this.apiUrl}/api/pools-v3/info`,
    poolsV3InfoSchema,
    { headers: this.basicAuthHeaders }
  );

  getHistory = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/history/${address}`,
    historySchema,
    { headers: this.basicAuthHeaders }
  );

  getPricesWithQuoteAsset = () => fetchWithValidation(
    `${this.apiUrl}/api/quotedPrices`,
    pricesWithQuoteAssetSchema,
    { headers: this.basicAuthHeaders }
  );

  /**
   * @deprecated In favor of getPlatformFees
   */
  getTokensFee = () => fetchWithValidation(
    `${this.apiUrl}/api/tokensFee`,
    z.record(z.string()).transform(makePartial),
    { headers: this.basicAuthHeaders }
  );

  getPlatformFees = ({
    assetIn,
    assetOut,
    walletAddress,
    fromWidget
  }: PlatformFees
  ) => {
    const url = new URL(`${this.apiUrl}/api/platform-fees`);

    url.searchParams.append('assetIn', assetIn);
    url.searchParams.append('assetOut', assetOut);

    if (walletAddress !== undefined) {
      url.searchParams.append('walletAddress', walletAddress);
    }

    if (fromWidget !== undefined) {
      url.searchParams.append('fromWidget', fromWidget);
    }

    return fetchWithValidation(
      url.toString(),
      z.record(z.string()).transform(makePartial),
      { headers: this.basicAuthHeaders }
    )
  };

  getGasPriceWei = () => fetchWithValidation(
    `${this.apiUrl}/api/gasPrice`,
    z.string(),
    { headers: this.basicAuthHeaders }
  );

  checkFreeRedeemAvailable = (walletAddress: string) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/has-free-redeem/${walletAddress}`,
    z.boolean(),
    { headers: this.basicAuthHeaders }
  );

  getRedeemOrderBySecretHash = (secretHash: string) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/redeem-order/${secretHash}`,
    z.object({
      secretHash: z.string(),
      secret: z.string(),
      redeemTxHash: z.string(),
    }),
    { headers: this.basicAuthHeaders }
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
        ...this.basicAuthHeaders,
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
        ...this.basicAuthHeaders,
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
        ...this.basicAuthHeaders,
      },
    },
  );

  checkRedeem = (secretHash: string) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/matcher-redeem/${secretHash}`,
    z.enum(['OK', 'FAIL']).nullable(),
    { headers: this.basicAuthHeaders }
  );

  checkRedeem2Atomics = (firstSecretHash: string, secondSecretHash: string) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/matcher-redeem/${firstSecretHash}-${secondSecretHash}`,
    z.enum(['OK', 'FAIL']).nullable(),
    { headers: this.basicAuthHeaders }
  );

  getBlockNumber = () => fetchWithValidation(`${this.apiUrl}/api/blocknumber`, z.number().int(), { headers: this.basicAuthHeaders });

  getIDOInfo = () => fetchWithValidation(`${this.apiUrl}/api/solarflare`, IDOSchema, { headers: this.basicAuthHeaders });

  checkAuth = (headers: IAdminAuthHeaders) => fetchWithValidation(`${this.apiUrl}/api/auth/check`, z.object({
    auth: z.boolean(),
  }), { headers: { ...headers, ...this.basicAuthHeaders } });

  getPool = (address: string, headers: IAdminAuthHeaders) => fetchWithValidation(
    `${this.apiUrl}/api/pools/${address}`,
    adminPoolSchema,
    { headers: { ...headers, ...this.basicAuthHeaders } },
  );

  getPoolsList = (headers: IAdminAuthHeaders) => fetchWithValidation(
    `${this.apiUrl}/api/pools/list`,
    adminPoolsListSchema,
    { headers: { ...headers, ...this.basicAuthHeaders } },
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
        ...this.basicAuthHeaders,
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
        ...this.basicAuthHeaders,
      },
    },
    z.string(),
  );

  checkPoolInformation = (poolAddress: string) => fetchWithValidation(
    `${this.apiUrl}/api/pools/check/${poolAddress}`,
    pairStatusSchema,
    { headers: this.basicAuthHeaders },
  );

  getAtomicSwapAssets = () => fetchWithValidation(
    `${this.apiUrl}/api/atomic/swap-assets`,
    z.array(z.string()),
    { headers: this.basicAuthHeaders },
  );

  /**
   * Sender is user address in source BlockchainService instance \
   * Receiver is user address in target BlockchainService instance
   */
  getAtomicSwapHistory = (query: AtomicSwapHistorySourceQuery | AtomicSwapHistoryTargetQuery) => {
    const url = new URL(`${this.apiUrl}/api/atomic/history/`);

    Object.entries(query)
      .forEach(([key, value]) => {
        if (value === undefined) throw new Error('Value must be defined');
        url.searchParams.append(key, value.toString());
      });

    return fetchWithValidation(url.toString(), atomicHistorySchema, { headers: this.basicAuthHeaders });
  };

  getSourceAtomicSwapHistory = (query: AtomicSwapHistorySourceQuery) => {
    const url = new URL(`${this.apiUrl}/api/atomic/history/`);

    Object.entries(query)
      .forEach(([key, value]) => {
        if (value === undefined) throw new Error('Value must be defined');
        url.searchParams.append(key, value.toString());
      });

    if (query.type === undefined) url.searchParams.append('type', 'source');

    return fetchWithValidation(url.toString(), sourceAtomicHistorySchema, { headers: this.basicAuthHeaders });
  };

  getTargetAtomicSwapHistory = (query: AtomicSwapHistoryTargetQuery) => {
    const url = new URL(`${this.apiUrl}/api/atomic/history/`);

    Object.entries(query)
      .forEach(([key, value]) => {
        if (value === undefined) throw new Error('Value must be defined');
        url.searchParams.append(key, value.toString());
      });

    if (query.type === undefined) url.searchParams.append('type', 'target');

    return fetchWithValidation(url.toString(), targetAtomicHistorySchema, { headers: this.basicAuthHeaders });
  };

  checkIfHashUsed = (secretHashes: string[]) => fetchWithValidation(
    `${this.apiUrl}/api/atomic/is-hash-used`,
    z.record(z.boolean()).transform(makePartial),
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.basicAuthHeaders,
      },
      method: 'POST',
      body: JSON.stringify(secretHashes),
    },
  );

  getGovernanceContracts = () => fetchWithValidation(
    `${this.apiUrl}/api/governance/info`,
    governanceContractsSchema,
    { headers: this.basicAuthHeaders },
  );

  getGovernancePools = () => fetchWithValidation(
    `${this.apiUrl}/api/governance/pools`,
    governancePoolsSchema,
    { headers: this.basicAuthHeaders },
  );

  getGovernancePool = (address: string) => fetchWithValidation(
    `${this.apiUrl}/api/governance/pools/${address}`,
    governancePoolSchema,
    { headers: this.basicAuthHeaders },
  );

  getGovernanceChainsInfo = () => fetchWithValidation(
    `${this.apiUrl}/api/governance/chains-info`,
    governanceChainsInfoSchema,
    { headers: this.basicAuthHeaders },
  );
}

export * as schemas from './schemas/index.js';
export { BlockchainService };
