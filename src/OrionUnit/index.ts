import { ethers } from 'ethers';
import getOrionUnitSiblings from '../getOrionUnitSiblings';
import { OrionAggregator } from '../services/OrionAggregator';
import OrionAnalytics from '../services/OrionAnalytics';
import { OrionBlockchain } from '../services/OrionBlockchain';
import { PriceFeed } from '../services/PriceFeed';
import { SupportedChainId } from '../types';
import Exchange from './Exchange';
import FarmingManager from './FarmingManager';
import { chains, envs } from '../config';
import { isValidChainId } from '../utils';

const orionAnalyticsUrl = 'https://trade.orionprotocol.io';

type Options = {
  api?: string;
  services?: {
    orionBlockchain?: {
      api?: string;
    },
    orionAggregator?: {
      api?: string;
    },
    priceFeed?: {
      api?: string;
    },
  }
};
export default class OrionUnit {
  public readonly env: string;

  public readonly networkCode: string;

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
    chain: string,
    env: string,
    options?: Options,
  ) {
    if (!(env in envs)) {
      throw new Error(`Env '${env}' not found. Available environments is: ${Object.keys(envs).join(', ')}`);
    }

    const envInfo = envs[env];
    const envNetworks = envInfo?.networks;
    let chainId: SupportedChainId;

    if (isValidChainId(chain)) chainId = chain;
    else {
      const targetChains = Object
        .keys(chains)
        .filter(isValidChainId)
        .filter((ch) => {
          const chainInfo = chains[ch];
          if (!chainInfo) return false;
          return (chainInfo.chainId in envNetworks)
          && (chainInfo.code.toLowerCase() === chain.toLowerCase());
        });
      if (targetChains.length !== 1) {
        throw new Error(
          targetChains.length > 1
            ? 'Ambiguation detected. '
            + `Found ${targetChains.length} chain ids [${targetChains.join(', ')}] for chain name '${chain}' in env '${env}'. Expected 1.`
            : `Chains not found for chain name '${chain}' in env '${env}'.`,
        );
      }
      [chainId] = targetChains;
    }

    if (!(chainId in envNetworks)) {
      throw new Error(`Chain '${chainId}' not found. `
          + `Available chains in selected environment (${env}) is: ${Object.keys(envNetworks).join(', ')}`);
    }

    const envNetworkInfo = envNetworks[chainId];
    const chainInfo = chains[chainId];

    if (!envNetworkInfo) throw new Error('Env network info is required');
    if (!chainInfo) throw new Error('Chain info is required');

    const apiUrl = envNetworkInfo.api;

    this.chainId = chainId;
    this.networkCode = chainInfo.code;
    this.provider = new ethers.providers.StaticJsonRpcProvider(envNetworkInfo.rpc ?? chainInfo.rpc);
    this.env = env;
    this.apiUrl = apiUrl;

    this.orionBlockchain = new OrionBlockchain(
      options?.services?.orionBlockchain?.api
      ?? options?.api
      ?? apiUrl,
    );

    const oaUrl = new URL(options?.services?.orionAggregator?.api ?? options?.api ?? apiUrl);
    const oaWsProtocol = oaUrl.protocol === 'https:' ? 'wss' : 'ws';
    const orionAggregatorWsUrl = `${oaWsProtocol}://${oaUrl.host + (oaUrl.pathname === '/' ? '' : oaUrl.pathname)}/v1`;
    this.orionAggregator = new OrionAggregator(
      chainId,
      options?.services?.orionAggregator?.api ?? `${options?.api ?? apiUrl}/backend`,
      orionAggregatorWsUrl,
    );
    this.priceFeed = new PriceFeed(
      options?.services?.priceFeed?.api
      ?? options?.api
      ?? apiUrl,
    );
    this.orionAnalytics = new OrionAnalytics(orionAnalyticsUrl);
    this.exchange = new Exchange(this);
    this.farmingManager = new FarmingManager(this);
  }

  get siblings() {
    return getOrionUnitSiblings(this.chainId, this.env);
  }
}
