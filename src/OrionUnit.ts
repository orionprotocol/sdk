import { ethers } from 'ethers';
import { OrionAggregator } from './services/OrionAggregator';
import { OrionBlockchain } from './services/OrionBlockchain';
import { PriceFeed } from './services/PriceFeed';
import { SupportedChainId } from './types';

export default class OrionUnit {
  public env: string;

  public chainId: SupportedChainId;

  public provider: ethers.providers.StaticJsonRpcProvider;

  public orionBlockchain: OrionBlockchain;

  public orionAggregator: OrionAggregator;

  public priceFeed: PriceFeed;

  public apiUrl: string;

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
}
