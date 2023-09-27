import {
  environmentResponseSchema,
  getPoolResponseSchema,
  listNFTOrderResponseSchema,
  listPoolResponseSchema,
  veORNInfoSchema,
} from './schemas/index.js';
import { fetchWithValidation } from 'simple-typed-fetch';

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

type Payload =
    | GetEnvironmentPayload
    | ListNFTOrderPayload
    | GetPoolInfoPayload
    | ListPoolPayload
    | VeORNInfoPayload;

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
  }

  makeRPCPayload = (payload: Omit<Payload, 'chainId' | 'jsonrpc'>) => {
    return JSON.stringify({
      ...payload,
      chainId: this.chainId,
      jsonrpc: '1.0',
    });
  };

  veORNInfo = (address: string) => {
    return fetchWithValidation(this.apiUrl, veORNInfoSchema, {
      method: 'POST',
      body: this.makeRPCPayload({
        model: 'veORN',
        method: 'info',
        params: [address]
      })
    })
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
}

export * as schemas from './schemas/index.js';
export { IntegratorService };
