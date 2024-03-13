import { merge } from 'merge-anything';
import { chains, envs } from '../config/index.js';
import type { networkCodes } from '../constants/index.js';
import Unit from '../Unit/index.js';
import { ReferralSystem } from '../services/ReferralSystem/index.js';
import type { SupportedChainId, DeepPartial, VerboseUnitConfig, KnownEnv, EnvConfig, AggregatedAssets } from '../types.js';
import { isValidChainId } from '../utils/index.js';
import { simpleFetch } from 'simple-typed-fetch';
import Bridge from './bridge/index.js';

export default class Orion {
  public readonly env?: string;

  public readonly units: Partial<Record<SupportedChainId, Unit>>;

  public readonly referralSystem: ReferralSystem;

  public readonly bridge: Bridge;

  // TODO: get tradable assets (aggregated)

  // TODO: get tradable pairs (aggregated)

  constructor(
    envOrConfig: KnownEnv | EnvConfig = 'production',
    overrides?: DeepPartial<EnvConfig>
  ) {
    let config: EnvConfig;
    if (typeof envOrConfig === 'string') {
      const envConfig = envs[envOrConfig];
      if (!envConfig) {
        throw new Error(`Invalid environment: ${envOrConfig}. Available environments: ${Object.keys(envs).join(', ')}`);
      }
      this.env = envOrConfig;
      config = {
        analyticsAPI: envConfig?.analyticsAPI,
        referralAPI: envConfig.referralAPI,
        networks: Object.entries(envConfig.networks).map(([chainId, networkConfig]) => {
          if (!isValidChainId(chainId)) throw new Error(`Invalid chainId: ${chainId}`);
          const chainConfig = chains[chainId];
          if (!chainConfig) {
            throw new Error(`Chain config not found: ${chainId}. Available chains: ${Object.keys(chains).join(', ')}`);
          }

          return {
            env: envOrConfig,
            chainId,
            api: networkConfig.api,
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
                api: networkConfig.api + networkConfig.services.indexer?.http,
              }
            },
          };
        })
          .reduce<Partial<Record<SupportedChainId, VerboseUnitConfig>>>((acc, cur) => {
            acc[cur.chainId] = cur;
            return acc;
          }, {}),
      };

      if (overrides) {
        // Recursive merge of config and overrides. Ignore undefined values.
        config = merge(config, overrides);
      }
    } else {
      config = envOrConfig;
    }

    this.referralSystem = new ReferralSystem(config.referralAPI);

    this.units = Object.entries(config.networks)
      .reduce<Partial<Record<SupportedChainId, Unit>>>((acc, [chainId, networkConfig]) => {
        if (!isValidChainId(chainId)) throw new Error(`Invalid chainId: ${chainId}`);
        const chainConfig = chains[chainId];
        if (!chainConfig) throw new Error(`Chain config not found: ${chainId}`);

        const unit = new Unit({
          // env: networkConfig.env,
          chainId,
          // api: networkConfig.api,
          nodeJsonRpc: networkConfig.nodeJsonRpc,
          services: networkConfig.services,
        });
        return {
          ...acc,
          [chainId]: unit,
        }
      }, {});

    this.bridge = new Bridge(
      this.unitsArray,
    );
  }

  get unitsArray() {
    return Object.entries(this.units).map(([, unit]) => unit);
  }

  getUnit(networkCodeOrChainId: typeof networkCodes[number] | SupportedChainId): Unit {
    let unit: Unit | undefined;
    if (isValidChainId(networkCodeOrChainId)) {
      unit = this.units[networkCodeOrChainId];
    } else {
      unit = this.unitsArray.find((u) => u.networkCode === networkCodeOrChainId);
    }
    if (!unit) {
      throw new Error(
        `Invalid network code: ${networkCodeOrChainId}. ` +
        `Available network codes: ${this.unitsArray.map((u) => u.networkCode).join(', ')}`);
    }
    return unit;
  }

  getSiblingsOf(chainId: SupportedChainId) {
    return this.unitsArray.filter((unit) => unit.chainId !== chainId);
  }

  async getAssets(tradableOnly = true) {
    const aggregatedAssets: AggregatedAssets = {};

    await Promise.all(this.unitsArray.map(async (unit) => {
      const { assetToAddress } = await simpleFetch(unit.blockchainService.getInfo)();
      Object.entries(assetToAddress).forEach(([asset, address]) => {
        if (address === undefined) throw new Error(`Address is undefined for asset: ${asset}`);
        aggregatedAssets[asset] = {
          ...aggregatedAssets[asset],
          [unit.chainId]: {
            address,
          },
        }
      });
    }));

    if (tradableOnly) {
      const tradableAggregatedAssets: AggregatedAssets = {};
      const aggregatedPairs = await this.getPairs('spot');
      Object.entries(aggregatedPairs).forEach(([pair, chainIds]) => {
        const [baseAsset, quoteAsset] = pair.split('-');
        if (chainIds === undefined) throw new Error(`ChainIds is undefined for pair: ${pair}`);
        if (baseAsset === undefined || quoteAsset === undefined) throw new Error(`Invalid pair: ${pair}`);

        const aggregatedBaseAsset = aggregatedAssets[baseAsset];
        if (aggregatedBaseAsset === undefined) {
          const networks = chainIds.map((chainId) => chains[chainId]?.label).join(', ');
          console.error(
            `Asset found in Aggregator, but not in BlockchainService (base): ${baseAsset} (${pair}).` +
            ` Networks: ${networks}`
          );
        } else {
          tradableAggregatedAssets[baseAsset] = aggregatedBaseAsset;
        }
        const aggregatedQuoteAsset = aggregatedAssets[quoteAsset];
        if (aggregatedQuoteAsset === undefined) {
          const networks = chainIds.map((chainId) => chains[chainId]?.label).join(', ');
          console.error(
            `Asset found in Aggregator, but not in BlockchainService (quote): ${quoteAsset} (${pair}).` +
            ` Networks: ${networks}`
          );
        } else {
          tradableAggregatedAssets[quoteAsset] = aggregatedQuoteAsset;
        }
      });
    }
    return aggregatedAssets;
  }

  async getPairs(...params: Parameters<Unit['aggregator']['getPairsList']>) {
    const result: Partial<
      Record<
        string,
        SupportedChainId[]
      >
    > = {};

    await Promise.all(this.unitsArray.map(async (unit) => {
      const pairs = await simpleFetch(unit.aggregator.getPairsList)(...params);
      pairs.forEach((pair) => {
        result[pair] = [
          ...(result[pair] ?? []),
          unit.chainId,
        ];
      });
    }));

    return result;
  }
}
