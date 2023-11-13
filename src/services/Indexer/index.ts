import {
  environmentResponseSchema,
  getPoolResponseSchema,
  listAmountResponseSchema,
  listNFTOrderResponseSchema,
  listPoolResponseSchema,
  listPoolV2ResponseSchema,
  listPoolV3ResponseSchema,
  PoolV2InfoResponseSchema,
  testIncrementorSchema,
  veORNInfoResponseSchema,
  votingInfoResponseSchema
} from './schemas';
import { fetchWithValidation } from 'simple-typed-fetch';
import { BigNumber } from 'bignumber.js';
import { WEEK_DAYS, YEAR } from '../../constants';
import { LOCK_START_TIME } from './constants';

type BasePayload = {
  chainId: number
  jsonrpc: '1.0'
};

type GetEnvironmentPayload = BasePayload & {
  model: 'Environment'
  method: 'getEnvironment'
  params: []
};

type ListNFTOrderPayload = BasePayload & {
  model: 'OrionV3NFTManager'
  method: 'listNFTOrder'
  params: [string]
};

type GetPoolInfoPayload = BasePayload & {
  model: 'OrionV3Factory' | 'OrionV2Factory'
  method: 'getPoolInfo'
  params: [string, string, string]
};

type ListPoolPayload = BasePayload & {
  model: 'OrionFarmV3'
  method: 'listPool'
  params: [string]
};

type VeORNInfoPayload = BasePayload & {
  model: 'veORN'
  method: 'info'
  params: [string]
};

type ListAmountPayload = BasePayload & {
  model: string
  method: 'listAmount'
  params: []
};

type GetAmountByORNPayload = BasePayload & {
  amountToken: number
  timeLock: number
};

type Payload =
  | GetEnvironmentPayload
  | ListNFTOrderPayload
  | GetPoolInfoPayload
  | ListPoolPayload
  | VeORNInfoPayload
  | ListAmountPayload
  | GetAmountByORNPayload;

class IndexerService {
  private readonly apiUrl: string;

  private readonly chainId: number;

  get api() {
    return this.apiUrl;
  }

  constructor(apiUrl: string, chainId: number) {
    this.apiUrl = apiUrl;
    this.chainId = chainId;

    this.getEnvironment = this.getEnvironment.bind(this);
    this.listNFTOrder = this.listNFTOrder.bind(this);
    this.getPoolInfo = this.getPoolInfo.bind(this);
    this.getListPool = this.getListPool.bind(this);
    this.listPoolV2 = this.listPoolV2.bind(this);
    this.poolV2Info = this.poolV2Info.bind(this);
    this.listPoolV3 = this.listPoolV3.bind(this);
    this.veORNInfo = this.veORNInfo.bind(this);
    this.listAmount = this.listAmount.bind(this);
    this.getAmountByORN = this.getAmountByORN.bind(this);
    this.getAmountAtCurrent = this.getAmountAtCurrent.bind(this);
    this.getVotingInfo = this.getVotingInfo.bind(this);
  }

  readonly makeRPCPayload = (payload: Omit<Payload, 'chainId' | 'jsonrpc'>) => {
    return JSON.stringify({
      ...payload,
      chainId: this.chainId,
      jsonrpc: '1.0',
    });
  };

  readonly veORNInfo = (address?: string) => {
    return fetchWithValidation(this.apiUrl, veORNInfoResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'veORN',
        method: 'info',
        params: [address],
      }),
    });
  };

  readonly getAmountAtCurrent = (amount: number): BigNumber => {
    const timestamp = Date.now() / 1000;

    // sqrt
    return BigNumber(amount).dividedBy(this.getK(timestamp));
  };

  readonly getAmountByORN = (amountToken: string, lockingDays: number) => {
    const alpha = 730 / (30 - Math.sqrt(730 / 7)) ** (1 / 3);

    const deltaDaysBN = BigNumber(lockingDays);

    if (deltaDaysBN.lte(0)) return BigNumber(0);

    const multSQRT = deltaDaysBN.dividedBy(WEEK_DAYS).sqrt();
    const multCUBE = deltaDaysBN.dividedBy(alpha).pow(3);

    return BigNumber(amountToken)
      .multipliedBy(multSQRT.plus(multCUBE));
  };

  readonly getVotingInfo = (userAddress?: string) => {
    return fetchWithValidation(this.apiUrl, votingInfoResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionVoting',
        method: 'info',
        params: [userAddress],
      }),
    });
  };

  readonly getEnvironment = () => {
    return fetchWithValidation(this.apiUrl, environmentResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'Environment',
        method: 'getEnvironment',
        params: [],
      }),
    });
  };

  readonly listNFTOrder = (address: string) => {
    return fetchWithValidation(this.apiUrl, listNFTOrderResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionV3NFTManager',
        method: 'listNFTOrder',
        params: [address],
      }),
    });
  };

  readonly getListPool = (userAddress?: string) => {
    return fetchWithValidation(this.apiUrl, listPoolResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionVoting',
        method: 'listPool',
        params: [userAddress],
      }),
    });
  };

  readonly getPoolInfo = (
    token0: string,
    token1: string,
    poolAddress?: string
  ) => {
    return fetchWithValidation(this.apiUrl, getPoolResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionV3Factory',
        method: 'getPoolInfo',
        params: [token0, token1, poolAddress],
      }),
    });
  };

  readonly listPoolV2 = (address?: string) => {
    return fetchWithValidation(this.apiUrl, listPoolV2ResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionFarmV2',
        method: 'listPool',
        params: [address],
      }),
    });
  };

  readonly poolV2Info = (token0: string, token1: string, address: string) => {
    return fetchWithValidation(this.apiUrl, PoolV2InfoResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionV2Factory',
        method: 'getPoolInfo',
        params: [token0, token1, address],
      }),
    });
  };

  readonly listPoolV3 = (address?: string) => {
    return fetchWithValidation(this.apiUrl, listPoolV3ResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionFarmV3',
        method: 'listPool',
        params: [address],
      }),
    });
  };

  readonly listAmount = (poolKey: string) => {
    return fetchWithValidation(this.apiUrl, listAmountResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: poolKey,
        method: 'listAmount',
        params: [],
      }),
    });
  };

  readonly testRetrieve = () => {
    return fetchWithValidation(this.apiUrl, testIncrementorSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'Incrementer',
        method: 'retrieve',
        params: [],
      }),
    });
  };

  private readonly getK = (time: number) => {
    const currentTime = time < LOCK_START_TIME ? LOCK_START_TIME : time;

    const deltaYears = BigNumber(currentTime)
      .minus(LOCK_START_TIME)
      .dividedBy(YEAR);
    return 2 ** BigNumber(deltaYears).multipliedBy(2).toNumber();
  };
}

export * as schemas from './schemas/index.js';
export { IndexerService };
