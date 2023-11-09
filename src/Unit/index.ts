import { JsonRpcProvider } from 'ethers';
import { Aggregator } from '../services/Aggregator/index.js';
import { BlockchainService } from '../services/BlockchainService/index.js';
import { PriceFeed } from '../services/PriceFeed/index.js';
import type {
  KnownEnv,
  SupportedChainId,
  VerboseUnitConfig,
} from '../types.js';
import Exchange from './Exchange/index.js';
import FarmingManager from './FarmingManager/index.js';
import { chains, envs } from '../config/index.js';
import type { networkCodes } from '../constants/index.js';
import { IndexerService } from '../services/Indexer/index.js';

type KnownConfig = {
  env: KnownEnv
  chainId: SupportedChainId
};

export default class Unit {
  public readonly networkCode: (typeof networkCodes)[number];

  public readonly chainId: SupportedChainId;

  public readonly provider: JsonRpcProvider;

  public readonly blockchainService: BlockchainService;

  public readonly indexer: IndexerService;

  public readonly aggregator: Aggregator;

  public readonly priceFeed: PriceFeed;

  public readonly exchange: Exchange;

  public readonly farmingManager: FarmingManager;

  public readonly config: VerboseUnitConfig;

  public readonly contracts: Record<string, string>;

  constructor(config: KnownConfig | VerboseUnitConfig) {
    if ('env' in config) {
      const staticConfig = envs[config.env];
      if (!staticConfig) {
        throw new Error(
          `Invalid environment: ${
            config.env
          }. Available environments: ${Object.keys(envs).join(', ')}`
        );
      }

      const chainConfig = chains[config.chainId];
      if (!chainConfig) {
        throw new Error(
          `Invalid chainId: ${
            config.chainId
          }. Available chainIds: ${Object.keys(chains).join(', ')}`
        );
      }

      const networkConfig = staticConfig.networks[config.chainId];
      if (!networkConfig) {
        throw new Error(
          `Invalid chainId: ${
            config.chainId
          }. Available chainIds: ${Object.keys(staticConfig.networks).join(
            ', '
          )}`
        );
      }
      this.config = {
        chainId: config.chainId,
        nodeJsonRpc: networkConfig.rpc ?? chainConfig.rpc,
        services: {
          blockchainService: {
            http: networkConfig.api + networkConfig.services.blockchain.http,
          },
          aggregator: {
            http: networkConfig.api + networkConfig.services.aggregator.http,
            ws: networkConfig.api + networkConfig.services.aggregator.ws,
          },
          priceFeed: {
            api: networkConfig.api + networkConfig.services.priceFeed.all,
          },
          indexer: {
            api: networkConfig.api + networkConfig.services.indexer.http,
          },
        },
      };
    } else {
      this.config = config;
    }
    const chainInfo = chains[config.chainId];
    if (!chainInfo) throw new Error('Chain info is required');
    this.chainId = config.chainId;
    this.networkCode = chainInfo.code;
    this.contracts = chainInfo.contracts;
    const intNetwork = parseInt(this.chainId, 10);
    if (Number.isNaN(intNetwork)) {
      throw new Error('Invalid chainId (not a number)' + this.chainId);
    }
    this.provider = new JsonRpcProvider(this.config.nodeJsonRpc, intNetwork);
    this.provider.pollingInterval = 1000;

    this.blockchainService = new BlockchainService(
      this.config.services.blockchainService.http,
      this.config.basicAuth
    );
    this.indexer = new IndexerService(
      this.config.services.indexer.api,
      intNetwork
    );
    this.aggregator = new Aggregator(
      this.config.services.aggregator.http,
      this.config.services.aggregator.ws,
      this.config.basicAuth
    );
    this.priceFeed = new PriceFeed(
      this.config.services.priceFeed.api,
      this.config.basicAuth
    );
    this.exchange = new Exchange(this);
    this.farmingManager = new FarmingManager(this);
  }
}
