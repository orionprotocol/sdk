import { z } from 'zod';
import { SupportedChainId } from '../../types';

export const pureEnvPayloadSchema = z.object({
  networks: z.record(
    z.nativeEnum(SupportedChainId),
    z.object({
      api: z.string(),
      rpc: z.string().optional(),
      liquidityMigratorAddress: z.string().optional(),
    }),
  ),
});

export const pureEnvSchema = z.record(
  z.string(),
  pureEnvPayloadSchema,
);
