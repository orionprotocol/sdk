import { z } from 'zod';
import { SupportedChainId } from '../../constants/chains';

const pureEnvSchema = z.record(
  z.string(),
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
