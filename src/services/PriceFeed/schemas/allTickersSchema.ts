import { z } from 'zod'

const tickerSchema = z.object({
  pair: z.string(),
  volume24: z.number(),
  change24: z.number(),
  lastPrice: z.number(),
});

export const allTickersSchema = tickerSchema.array();
