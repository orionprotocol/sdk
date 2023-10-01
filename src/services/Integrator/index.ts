import {
  environmentResponseSchema,
  getPoolResponseSchema,
  listAmountResponseSchema,
  listNFTOrderResponseSchema,
  listPoolResponseSchema,
  veORNInfoResponseSchema,
  votingInfoResponseSchema
} from './schemas/index.js';
import { fetchWithValidation } from 'simple-typed-fetch';
import { BigNumber } from 'bignumber.js';
import { DAY, WEEK_DAYS, YEAR } from '../../constants/index.js';
import { LOCK_START_TIME } from './constants.js';

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
  model: 'OrionV3Factory'
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
}

type ListAmountPayload = BasePayload & {
  model: string
  method: 'listAmount'
  params: []
}

type GetAmountByORNPayload = BasePayload & {
  amountToken: number
  timeLock: number
}

type Payload =
    | GetEnvironmentPayload
    | ListNFTOrderPayload
    | GetPoolInfoPayload
    | ListPoolPayload
    | VeORNInfoPayload
    | ListAmountPayload
    | GetAmountByORNPayload;

class IntegratorService {
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
    this.listPool = this.listPool.bind(this);
    this.veORNInfo = this.veORNInfo.bind(this);
    this.listAmount = this.listAmount.bind(this);
    this.getAmountByORN = this.getAmountByORN.bind(this);
    this.getAmountAtCurrent = this.getAmountAtCurrent.bind(this);
    this.getVotingInfo = this.getVotingInfo.bind(this);
  }

  makeRPCPayload = (payload: Omit<Payload, 'chainId' | 'jsonrpc'>) => {
    return JSON.stringify({
      ...payload,
      chainId: this.chainId,
      jsonrpc: '1.0',
    });
  };

  veORNInfo = (address: string) => {
    return fetchWithValidation(this.apiUrl, veORNInfoResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'veORN',
        method: 'info',
        params: [address]
      })
    })
  }

  getAmountAtCurrent = (amount: number): BigNumber => {
    const timestamp = Date.now() / 1000;

    // sqrt
    return BigNumber(amount).dividedBy(this.getK(timestamp));
  }

  getVotingInfo = (userAddress: number) => {
    return fetchWithValidation(this.apiUrl, votingInfoResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionVoting',
        method: 'info',
        params: [userAddress],
      }),
    });
  }

  private readonly getEnvironment = () => {
    return fetchWithValidation(this.apiUrl, environmentResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'Environment',
        method: 'getEnvironment',
        params: [],
      }),
    });
  };

  private readonly listNFTOrder = (address: string) => {
    return fetchWithValidation(this.apiUrl, listNFTOrderResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionV3NFTManager',
        method: 'listNFTOrder',
        params: [address],
      }),
    });
  };

  private readonly getPoolInfo = (
    token0: string,
    token1: string,
    poolAddress: string
  ) => {
    return fetchWithValidation(this.apiUrl, getPoolResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionV3Factory',
        method: 'getPoolInfo',
        params: [token0, token1, poolAddress],
      }),
    });
  }

  private readonly listPool = (address: string) => {
    return fetchWithValidation(this.apiUrl, listPoolResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'OrionFarmV3',
        method: 'listPool',
        params: [address],
      }),
    });
  }

  private readonly listAmount = (poolKey: string) => {
    return fetchWithValidation(this.apiUrl, listAmountResponseSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: poolKey,
        method: 'listAmount',
        params: [],
      }),
    });
  }

  private readonly getK = (time: number) => {
    const currentTime = time < LOCK_START_TIME ? LOCK_START_TIME : time;

    const deltaYears = BigNumber(currentTime).minus(LOCK_START_TIME).dividedBy(YEAR);
    return 2 ** BigNumber(deltaYears).multipliedBy(2).toNumber();
  }

  private readonly getAmountByORN = (amountToken: number, timeLock: number) => {
    const timestamp = Date.now() / 1000;

    const deltaDays = BigNumber(timeLock).minus(timestamp).dividedBy(DAY);
    if (deltaDays.lt(0)) {
      return 0;
    }

    // sqrt
    return BigNumber(amountToken).multipliedBy(BigNumber(deltaDays).sqrt()).dividedBy(BigNumber(WEEK_DAYS).sqrt());
  }
}

export * as schemas from './schemas/index.js';
export { IntegratorService };
