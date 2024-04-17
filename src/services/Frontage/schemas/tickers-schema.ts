import { z } from 'zod';

export const tickerSchema = z.object({
  pair: z.string(),
  volume24: z.number(),
  change24: z.number(),
  lastPrice: z.number(),
  networks: z.array(z.string()),
});

export const tickersSchema = z.array(tickerSchema);
