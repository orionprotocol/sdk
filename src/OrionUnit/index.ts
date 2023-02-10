import { ethers } from 'ethers';
import { OrionAggregator } from '../services/OrionAggregator';
import { OrionBlockchain } from '../services/OrionBlockchain';
import { PriceFeed } from '../services/PriceFeed';
import type { SupportedChainId, VerboseOrionUnitConfig } from '../types';
import Exchange from './Exchange';
import FarmingManager from './FarmingManager';
import { chains } from '../config';
import { networkCodes } from '../constants';

// type KnownConfig = {
//   env: string;
//   chainId: SupportedChainId;
// }

// type OrionUnitConfig = KnownConfig | VerboseOrionUnitConfig;

export default class OrionUnit {
  // public readonly env?: string;

  public readonly networkCode: typeof networkCodes[number];

  public readonly chainId: SupportedChainId;

  public readonly provider: ethers.providers.StaticJsonRpcProvider;

  public readonly orionBlockchain: OrionBlockchain;

  public readonly orionAggregator: OrionAggregator;

  public readonly priceFeed: PriceFeed;

  public readonly exchange: Exchange;

  public readonly farmingManager: FarmingManager;

  // constructor(config: KnownConfig);
  // constructor(config: VerboseConfig);

  constructor(config: VerboseOrionUnitConfig) {
    const chainInfo = chains[config.chainId];
    if (!chainInfo) throw new Error('Chain info is required');

    // if ('env' in config)
    // this.env = config.env;
    this.chainId = config.chainId;
    this.networkCode = chainInfo.code;
    this.provider = new ethers.providers.StaticJsonRpcProvider(config.nodeJsonRpc);

    this.orionBlockchain = new OrionBlockchain(config.services.orionBlockchain.http);
    this.orionAggregator = new OrionAggregator(
      config.services.orionAggregator.http,
      config.services.orionAggregator.ws,
    );
    this.priceFeed = new PriceFeed(config.services.priceFeed.api);
    this.exchange = new Exchange(this);
    this.farmingManager = new FarmingManager(this);
  }

  // get siblings() {
  //   if (!this.env) throw new Error('Sibling is not available, because env is not set');

  //   const envInfo = envs[this.env];
  //   const envNetworks = envInfo?.networks;

  //   if (envNetworks === undefined) throw new Error('Env networks is undefined (siblings)');

  //   const orionUnits: OrionUnit[] = [];
  //   Object
  //     .entries(envNetworks)
  //     .forEach(([chainId, config]) => {
  //       if (!isValidChainId(chainId)) throw new Error('Invalid chainId');
  //       if (chainId !== this.chainId) {
  //         const chainConfig = chains[chainId];
  //         if (!chainConfig) throw new Error('Chain config is required');
  //         const orionUnit = new OrionUnit({
  //           api: config.api,
  //           chainId,
  //           nodeJsonRpc: chainConfig.rpc ?? config.rpc,
  //           services: {
  //             orionBlockchain: {
  //               http: config.api + config.services.blockchain.http,
  //             },
  //             orionAggregator: {
  //               http: config.api + config.services.aggregator.http,
  //               ws: config.api + config.services.aggregator.ws,
  //             },
  //             priceFeed: {
  //               api: config.api + config.services.priceFeed.all,
  //             },
  //           },
  //         });
  //         orionUnits.push(orionUnit);
  //       }
  //     });
  //   return orionUnits;
  // }
}
