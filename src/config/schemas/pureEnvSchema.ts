import { z } from 'zod';
import { SupportedChainId } from '../../constants/chains';

const pureEnvSchema = z.object({
  networks: z.array(z.object({
    chainId: z.nativeEnum(SupportedChainId),
    api: z.string(),
    matcherAddress: z.string(),
    rpc: z.string().optional(),
  })),
});

export default pureEnvSchema;
