import { z } from 'zod';

const swapInfoBase = z.object({
  id: z.string(),
  amountIn: z.number(),
  amountOut: z.number(),
  assetIn: z.string(),
  assetOut: z.string(),
  path: z.array(z.string()),
  isThroughPoolOptimal: z.boolean(),
  executionInfo: z.string(),
  orderInfo: z.object({
    assetPair: z.string(),
    side: z.enum(['BUY', 'SELL']),
    amount: z.number(),
    safePrice: z.number(),
  }).nullable(),
  exchanges: z.array(z.string()).optional(),
  price: z.number().nullable(), // spending asset price
  minAmountOut: z.number(),
  minAmountIn: z.number(),
  marketPrice: z.number().nullable(), // spending asset market price
});

const swapInfoByAmountIn = swapInfoBase.extend({
  availableAmountOut: z.null(),
  availableAmountIn: z.number(),
  marketAmountOut: z.number().nullable(),
  marketAmountIn: z.null(),
}).transform((val) => ({
  ...val,
  type: 'exactSpend' as const,
}));

const swapInfoByAmountOut = swapInfoBase.extend({
  availableAmountOut: z.number(),
  availableAmountIn: z.null(),
  marketAmountOut: z.null(),
  marketAmountIn: z.number().nullable(),
}).transform((val) => ({
  ...val,
  type: 'exactReceive' as const,
}));

const swapInfoSchema = swapInfoByAmountIn.or(swapInfoByAmountOut);

export default swapInfoSchema;
