import { ethers } from 'ethers';
import getOrionUnitSiblings from '../getOrionUnitSiblings';
import { OrionAggregator } from '../services/OrionAggregator';
import OrionAnalytics from '../services/OrionAnalytics';
import { OrionBlockchain } from '../services/OrionBlockchain';
import { PriceFeed } from '../services/PriceFeed';
import { SupportedChainId } from '../types';
import Exchange from './Exchange';
import FarmingManager from './FarmingManager';

const orionAnalyticsHost = 'trade.orionprotocol.io';
export default class OrionUnit {
  public readonly env: string;

  public readonly chainId: SupportedChainId;

  public readonly provider: ethers.providers.StaticJsonRpcProvider;

  public readonly orionBlockchain: OrionBlockchain;

  public readonly orionAggregator: OrionAggregator;

  public readonly priceFeed: PriceFeed;

  public readonly orionAnalytics: OrionAnalytics;

  public readonly exchange: Exchange;

  public readonly farmingManager: FarmingManager;

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

    this.orionBlockchain = new OrionBlockchain(apiUrl);
    this.orionAggregator = new OrionAggregator(apiUrl, chainId);
    this.priceFeed = new PriceFeed(apiUrl);
    this.orionAnalytics = new OrionAnalytics(orionAnalyticsHost);
    this.exchange = new Exchange(this);
    this.farmingManager = new FarmingManager(this);
  }

  get siblings() {
    return getOrionUnitSiblings(this.chainId, this.env);
  }
}
