import { merge } from 'merge-anything';
import { chains, envs } from '../config';
import OrionUnit, { VerboseOrionUnitConfig } from '../OrionUnit';
import OrionAnalytics from '../services/OrionAnalytics';
import { ReferralSystem } from '../services/ReferralSystem';
import { DeepPartial, SupportedChainId } from '../types';
import { isValidChainId } from '../utils';

type EnvConfig = {
  analyticsAPI: string;
  referralAPI: string;
  networks: Partial<
    Record<
      SupportedChainId,
      VerboseOrionUnitConfig
    >
  >;
}

// type KnownEnv = 'testing' | 'staging' | 'production';

export default class Orion {
  public readonly units: Partial<Record<SupportedChainId, OrionUnit>>;

  public readonly orionAnalytics: OrionAnalytics;

  public readonly referralSystem: ReferralSystem;

  constructor(
    env: string,
    overrides?: DeepPartial<EnvConfig>
  );

  constructor(config: EnvConfig);

  constructor(
    envOrConfig: string | EnvConfig,
    overrides?: DeepPartial<EnvConfig>
  ) {
    let config: EnvConfig;
    if (typeof envOrConfig === 'string') {
      const envConfig = envs[envOrConfig];
      if (!envConfig) throw new Error(`Invalid environment: ${envOrConfig}. Available environments: ${Object.keys(envs).join(', ')}`);
      config = {
        analyticsAPI: envConfig.analyticsAPI,
        referralAPI: envConfig.referralAPI,
        networks: Object.entries(envConfig.networks).map(([chainId, networkConfig]) => {
          if (!isValidChainId(chainId)) throw new Error(`Invalid chainId: ${chainId}`);
          const chainConfig = chains[chainId];
          if (!chainConfig) throw new Error(`Chain config not found: ${chainId}. Available chains: ${Object.keys(chains).join(', ')}`);

          return {
            env: envOrConfig,
            chainId,
            api: networkConfig.api,
            nodeJsonRpc: chainConfig.rpc,
            services: {
              orionBlockchain: {
                http: networkConfig.api + networkConfig.services.blockchain.http,
              },
              orionAggregator: {
                http: networkConfig.api + networkConfig.services.aggregator.http,
                ws: networkConfig.api + networkConfig.services.aggregator.ws,
              },
              priceFeed: {
                api: networkConfig.api + networkConfig.services.priceFeed.all,
              },
            },
          };
        })
          .reduce<Partial<Record<SupportedChainId, VerboseOrionUnitConfig>>>((acc, cur) => {
            acc[cur.chainId] = cur;
            return acc;
          }, {}),
      };

      if (overrides) {
        config = merge(config, overrides);
      }
    } else {
      config = envOrConfig;
    }

    this.orionAnalytics = new OrionAnalytics(config.analyticsAPI);
    this.referralSystem = new ReferralSystem(config.referralAPI);

    this.units = Object.entries(config.networks)
      .reduce<Partial<Record<SupportedChainId, OrionUnit>>>((acc, [chainId, networkConfig]) => {
        if (!isValidChainId(chainId)) throw new Error(`Invalid chainId: ${chainId}`);
        const chainConfig = chains[chainId];
        if (!chainConfig) throw new Error(`Invalid chainId: ${chainId}`);

        const orionUnit = new OrionUnit({
          // env: networkConfig.env,
          chainId,
          // api: networkConfig.api,
          nodeJsonRpc: networkConfig.nodeJsonRpc,
          services: networkConfig.services,
        });
        return {
          ...acc,
          [chainId]: orionUnit,
        }
      }, {});
  }

  get unitsArray() {
    return Object.entries(this.units).map(([, unit]) => unit);
  }

  getUnit(networkCode: string) {
    const unit = this.unitsArray.find((unit) => unit.networkCode === networkCode);
    if (!unit) throw new Error(`Invalid network code: ${networkCode}. Available network codes: ${this.unitsArray.map((unit) => unit.networkCode).join(', ')}`);
    return unit;
  }

  getSiblingsOf(chainId: SupportedChainId) {
    return this.unitsArray.filter((unit) => unit.chainId !== chainId);
  }
}
