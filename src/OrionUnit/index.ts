import { ethers } from 'ethers';
import { OrionAggregator } from '../services/OrionAggregator';
import OrionAnalytics from '../services/OrionAnalytics';
import { OrionBlockchain } from '../services/OrionBlockchain';
import { PriceFeed } from '../services/PriceFeed';
import { SupportedChainId } from '../types';
import Exchange from './Exchange';
import FarmingManager from './FarmingManager';
import { chains, envs } from '../config';
import { isValidChainId } from '../utils';
import { ReferralSystem } from '../services/ReferralSystem';

const orionAnalyticsUrl = 'https://trade.orionprotocol.io';

type Options = {
  api?: string;
  nodeJsonRpc?: string;
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

  public readonly referralSystem: ReferralSystem;

  constructor(
    chain: string,
    env: string,
    options?: Options,
  ) {
    let chainId: SupportedChainId;
    let customApi: string | undefined;
    let customRpc: string | undefined;
    let chainInfo: typeof chains[SupportedChainId] | undefined;

    if (!(env in envs)) {
      if (env === 'custom') {
        if (!options?.api) throw new Error('Your env is custom. You should provide api url in options');
        const { api } = options;
        customApi = api;
        if (isValidChainId(chain)) {
          chainId = chain;
          chainInfo = chains[chain];
        } else throw new Error('Your chainId is invalid');
      } else {
        throw new Error(`Env '${env}' not found. Available environments is: ${Object.keys(envs).join(', ')}`);
      }
    } else {
      const envInfo = envs[env];
      const envNetworks = envInfo?.networks;
      if (envNetworks === undefined) throw new Error('Env networks is undefined (constructor)');

      if (isValidChainId(chain)) chainId = chain;
      else {
        const targetChains = Object
          .keys(chains)
          .filter(isValidChainId)
          .filter((ch) => {
            const chInfo = chains[ch];
            if (!chInfo) return false;
            return (chInfo.chainId in envNetworks)
          && (chInfo.code.toLowerCase() === chain.toLowerCase());
          });
        if (targetChains.length !== 1) {
          throw new Error(
            targetChains.length > 1
              ? 'Ambiguation detected. '
            + `Found ${targetChains.length} chain ids [${targetChains.join(', ')}] for chain name '${chain}' in env '${env}'. Expected 1.`
              : `Chains not found for chain name '${chain}' in env '${env}'.`,
          );
        }
        const firstTargetChain = targetChains[0];
        if (firstTargetChain === undefined) throw new Error('First target chain is undefined');
        chainId = firstTargetChain;
      }

      if (!(chainId in envNetworks)) {
        throw new Error(`Chain '${chainId}' not found. `
          + `Available chains in selected environment (${env}) is: ${Object.keys(envNetworks).join(', ')}`);
      }

      const envNetworkInfo = envNetworks[chainId];
      chainInfo = chains[chainId];

      if (!envNetworkInfo) throw new Error('Env network info is required');

      customApi = envNetworkInfo.api;
      customRpc = envNetworkInfo.rpc;
    }

    if (!chainInfo) throw new Error('Chain info is required');

    this.chainId = chainId;
    this.networkCode = chainInfo.code;
    this.provider = new ethers.providers.StaticJsonRpcProvider(options?.nodeJsonRpc ?? customRpc ?? chainInfo.rpc);
    this.env = env;
    this.apiUrl = customApi;

    this.orionBlockchain = new OrionBlockchain(
      options?.services?.orionBlockchain?.api
      ?? options?.api
      ?? customApi,
    );

    const oaUrl = new URL(options?.services?.orionAggregator?.api ?? options?.api ?? customApi);
    const oaWsProtocol = oaUrl.protocol === 'https:' ? 'wss' : 'ws';
    const orionAggregatorWsUrl = `${oaWsProtocol}://${oaUrl.host + (oaUrl.pathname === '/' ? '' : oaUrl.pathname)}/v1`;
    this.orionAggregator = new OrionAggregator(
      options?.services?.orionAggregator?.api ?? `${options?.api ?? customApi}/backend`,
      orionAggregatorWsUrl,
    );
    this.priceFeed = new PriceFeed(
      options?.services?.priceFeed?.api
      ?? `${options?.api ?? customApi}/price-feed`,
    );
    this.orionAnalytics = new OrionAnalytics(orionAnalyticsUrl);
    this.exchange = new Exchange(this);
    this.farmingManager = new FarmingManager(this);
    this.referralSystem = new ReferralSystem(`${options?.api ?? customApi}/referral-api`);
  }

  get siblings() {
    const envInfo = envs[this.env];
    const envNetworks = envInfo?.networks;

    if (envNetworks === undefined) throw new Error('Env networks is undefined (siblings)');

    const siblingsNetworks = Object
      .keys(envNetworks)
      .filter(isValidChainId)
      .filter((chainId) => chainId !== this.chainId);
    return siblingsNetworks.map((chainId) => new OrionUnit(chainId, this.env));
  }
}
