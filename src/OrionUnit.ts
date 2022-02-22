import { ethers } from 'ethers';
import { z } from 'zod';
import { SupportedChainId } from './constants/chains';
import OrionAggregator from './services/OrionAggregator';
import OrionBlockchain from './services/OrionBlockchain';
import balancesSchema from './services/OrionBlockchain/schemas/balancesSchema';
import PriceFeed from './services/PriceFeed';

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
    obWsMessageCb: (data: z.infer<typeof balancesSchema>) => void,
  ) {
    this.chainId = chainId;
    this.provider = new ethers.providers.StaticJsonRpcProvider(rpc);
    this.env = env;
    this.apiUrl = apiUrl;

    this.orionBlockchain = new OrionBlockchain(apiUrl, chainId, obWsMessageCb);
    this.orionAggregator = new OrionAggregator(apiUrl, chainId);
    this.priceFeed = new PriceFeed(apiUrl);
  }
}
