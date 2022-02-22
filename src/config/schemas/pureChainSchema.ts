import { z } from 'zod';
import { SupportedChainId } from '../../constants/chains';

const pureChainInfoSchema = z.object({
  chainId: z.nativeEnum(SupportedChainId),
  label: z.string(),
  code: z.string(),
  explorer: z.string(),
  rpc: z.string(),
  baseCurrencyName: z.string(),
});

export default pureChainInfoSchema;
