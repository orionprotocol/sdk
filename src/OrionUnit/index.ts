import { ethers } from 'ethers';
import { OrionAggregator } from '../services/OrionAggregator';
import { OrionBlockchain } from '../services/OrionBlockchain';
import { PriceFeed } from '../services/PriceFeed';
import swapMarket, { SwapMarketParams } from './swapMarket';
import { SupportedChainId } from '../types';

type PureSwapMarketParams= Omit<SwapMarketParams, 'orionUnit'>
export default class OrionUnit {
  public readonly env: string;

  public readonly chainId: SupportedChainId;

  public readonly provider: ethers.providers.StaticJsonRpcProvider;

  public readonly orionBlockchain: OrionBlockchain;

  public readonly orionAggregator: OrionAggregator;

  public readonly priceFeed: PriceFeed;

  public readonly apiUrl: string;

  constructor(
    chainId: SupportedChainId,
    rpc: string,
    env: string,
    apiUrl: string,
  ) {
    this.chainId = chainId;
    this.provider = new ethers.providers.StaticJsonRpcProvider(rpc);
    this.env = env;
    this.apiUrl = apiUrl;

    this.orionBlockchain = new OrionBlockchain(apiUrl, chainId);
    this.orionAggregator = new OrionAggregator(apiUrl, chainId);
    this.priceFeed = new PriceFeed(apiUrl);
  }

  public swapMarket(params: PureSwapMarketParams) {
    return swapMarket({
      ...params,
      orionUnit: this,
    });
  }
}
