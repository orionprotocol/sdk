import { z } from 'zod';
import { SupportedChainId } from '../../types.js';

export const pureEnvNetworksSchema = z.object({
  api: z.string(),
  services: z.object({
    blockchain: z.object({
      http: z.string(),
    }),
    aggregator: z.object({
      http: z.string(),
      ws: z.string(),
    }),
    priceFeed: z.object({
      all: z.string(),
    }),
    indexer: z.object({
      http: z.string(),
    }).optional(),
    frontage: z.object({
      http: z.string(),
    }),
  }),
  rpc: z.string().optional(),
  liquidityMigratorAddress: z.string().optional(),
});

export const pureEnvPayloadSchema = z.object({
  analyticsAPI: z.string().url().optional(),
  referralAPI: z.string().url(),
  networks: z.record(
    z.nativeEnum(SupportedChainId),
    pureEnvNetworksSchema
  ),
});

export const knownEnvs = ['production', 'staging', 'testing'] as const;

export const pureEnvSchema = z.record(
  z.enum(knownEnvs).or(z.string()),
  pureEnvPayloadSchema,
);
