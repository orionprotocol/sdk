import { z } from 'zod';

const orderbookElementSchema = z.object({
  price: z.number(),
  amount: z.number(),
  path: z.array(z.object({
    assetPair: z.string(),
    action: z.enum(['BUY', 'SELL']),
  })),
});

const aggregatedOrderbookElementSchema = orderbookElementSchema
  .extend({
    exchanges: z.string().array(),
  });

export const aggregatedOrderbookSchema = z.object({
  asks: z.array(aggregatedOrderbookElementSchema),
  bids: z.array(aggregatedOrderbookElementSchema),
});

export const exchangeOrderbookSchema = z.object({
  asks: z.array(orderbookElementSchema),
  bids: z.array(orderbookElementSchema),
});
