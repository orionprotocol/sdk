import { z } from 'zod';

const orderInfoSchema = z.object({
  assetPair: z.string().toUpperCase(),
  side: z.enum(['BUY', 'SELL']),
  amount: z.number(),
  safePrice: z.number(),
}).nullable();

const swapInfoBase = z.object({
  id: z.string(),
  amountIn: z.number(),
  amountOut: z.number(),
  assetIn: z.string().toUpperCase(),
  assetOut: z.string().toUpperCase(),
  path: z.array(z.string()),
  // isThroughPoolOptimal: z.boolean(), // deprecated
  executionInfo: z.string(),
  orderInfo: orderInfoSchema,
  exchanges: z.array(z.string()),
  price: z.number().nullable(), // spending asset price
  minAmountOut: z.number(),
  minAmountIn: z.number(),
  marketPrice: z.number().nullable(), // spending asset market price
  alternatives: z.object({ // execution alternatives
    exchanges: z.array(z.string()),
    path: z.object({
      units: z.object({
        assetPair: z.string().toUpperCase(),
        action: z.string(),
      }).array(),
    }),
    marketAmountOut: z.number().nullable(),
    marketAmountIn: z.number().nullable(),
    marketPrice: z.number(),
    availableAmountIn: z.number().nullable(),
    availableAmountOut: z.number().nullable(),
    orderInfo: orderInfoSchema,
    isThroughPoolOrCurve: z.boolean(),
  }).array(),
  assetNameMapping: z.record(z.string()).optional(), // address to ERC20 names
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
