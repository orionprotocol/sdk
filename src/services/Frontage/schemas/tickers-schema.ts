import { z } from 'zod';
import { SupportedChainId } from '../../../types';

export const tickerSchema = z.object({
  pair: z.string(),
  volume24: z.number(),
  change24: z.number(),
  lastPrice: z.number(),
  pricePrecision: z.number(),
  networks: z.array(z.nativeEnum(SupportedChainId)),
});

export const tickersSchema = z.array(tickerSchema);
