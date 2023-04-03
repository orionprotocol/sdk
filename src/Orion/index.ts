import type { BigNumber } from 'bignumber.js';
import type { ethers } from 'ethers';
import { merge } from 'merge-anything';
import { chains, envs } from '../config/index.js';
import type { networkCodes } from '../constants/index.js';
import OrionUnit from '../OrionUnit/index.js';
import { ReferralSystem } from '../services/ReferralSystem/index.js';
import type { SupportedChainId, DeepPartial, VerboseOrionUnitConfig, KnownEnv } from '../types.js';
import { isValidChainId } from '../utils/index.js';
import swap from './bridge/swap.js';
import getHistory from './bridge/getHistory.js';
import { simpleFetch } from 'simple-typed-fetch';

type EnvConfig = {
  analyticsAPI: string
  referralAPI: string
  networks: Partial<
    Record<
      SupportedChainId,
      VerboseOrionUnitConfig
    >
  >
}
type AggregatedAssets = Partial<
  Record<
    string,
    Partial<
      Record<SupportedChainId, {
        address: string
      }>
    >
  >
  >;

export default class Orion {
  public readonly env?: string;

  public readonly units: Partial<Record<SupportedChainId, OrionUnit>>;

  public readonly referralSystem: ReferralSystem;

  // TODO: get tradable assets (aggregated)

  // TODO: get tradable pairs (aggregated)

  // TODO: bridge

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
        analyticsAPI: envConfig.analyticsAPI,
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
        // Recursive merge of config and overrides. Ignore undefined values.
        config = merge(config, overrides);
      }
    } else {
      config = envOrConfig;
    }

    this.referralSystem = new ReferralSystem(config.referralAPI);

    this.units = Object.entries(config.networks)
      .reduce<Partial<Record<SupportedChainId, OrionUnit>>>((acc, [chainId, networkConfig]) => {
        if (!isValidChainId(chainId)) throw new Error(`Invalid chainId: ${chainId}`);
        const chainConfig = chains[chainId];
        if (!chainConfig) throw new Error(`Chain config not found: ${chainId}`);

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

  getUnit(networkCodeOrChainId: typeof networkCodes[number] | SupportedChainId): OrionUnit {
    let unit: OrionUnit | undefined;
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
      const { assetToAddress } = await simpleFetch(unit.orionBlockchain.getInfo)();
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
            `Asset found in Aggregator, but not in Orion Blockchain (base): ${baseAsset} (${pair}).` +
            ` Networks: ${networks}`
          );
        } else {
          tradableAggregatedAssets[baseAsset] = aggregatedBaseAsset;
        }
        const aggregatedQuoteAsset = aggregatedAssets[quoteAsset];
        if (aggregatedQuoteAsset === undefined) {
          const networks = chainIds.map((chainId) => chains[chainId]?.label).join(', ');
          console.error(
            `Asset found in Aggregator, but not in OrionBlockchain (quote): ${quoteAsset} (${pair}).` +
            ` Networks: ${networks}`
          );
        } else {
          tradableAggregatedAssets[quoteAsset] = aggregatedQuoteAsset;
        }
      });
    }
    return aggregatedAssets;
  }

  async getPairs(...params: Parameters<OrionUnit['orionAggregator']['getPairsList']>) {
    const result: Partial<
      Record<
        string,
        SupportedChainId[]
      >
    > = {};

    await Promise.all(this.unitsArray.map(async (unit) => {
      const pairs = await simpleFetch(unit.orionAggregator.getPairsList)(...params);
      pairs.forEach((pair) => {
        result[pair] = [
          ...(result[pair] ?? []),
          unit.chainId,
        ];
      });
    }));

    return result;
  }

  bridge = {
    getHistory: (address: string, limit = 1000) => getHistory(this.unitsArray, address, limit),
    swap: (
      assetName: string,
      amount: BigNumber.Value,
      sourceChain: SupportedChainId,
      targetChain: SupportedChainId,
      signer: ethers.Signer,
      options: {
        autoApprove?: boolean
        logger?: (message: string) => void
        withdrawToWallet?: boolean
      }
    ) => swap({
      amount,
      assetName,
      sourceChain,
      targetChain,
      signer,
      orion: this,
      options,
    })
  }
}
