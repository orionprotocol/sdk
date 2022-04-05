import { z } from 'zod';
import { SupportedChainId, SupportedEnv } from '../../types';

const pureEnvSchema = z.record(
  z.nativeEnum(SupportedEnv),
  z.object({
    networks: z.record(
      z.nativeEnum(SupportedChainId),
      z.object({
        api: z.string(),
        rpc: z.string().optional(),
        liquidityMigratorAddress: z.string().optional(),
      }),
    ),
  }),
);

export default pureEnvSchema;
