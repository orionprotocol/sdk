import { z } from 'zod';

export const searchTickersSchema = z.array(z.object({
  pair: z.string(),
  volume24: z.number(),
  change24: z.number(),
  lastPrice: z.number(),
  networks: z.array(z.string()),
}));
