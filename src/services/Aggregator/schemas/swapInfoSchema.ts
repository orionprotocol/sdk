import { z } from 'zod';

const orderInfoSchema = z.object({
  assetPair: z.string().toUpperCase(),
  side: z.enum(['BUY', 'SELL']),
  amount: z.number(),
  safePrice: z.number(),
}).nullable();

const exchangeContractStep = z.object({
  pool: z.string(),
  assetIn: z.string(),
  assetOut: z.string(),
  factory: z.string(),
});

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
  exchangeContractPath: z.array(exchangeContractStep),
  alternatives: z.object({ // execution alternatives
    exchanges: z.array(z.string()),
    path: z.array(z.string()),
    marketAmountOut: z.number().nullable(),
    marketAmountIn: z.number().nullable(),
    marketPrice: z.number(),
    availableAmountIn: z.number().nullable(),
    availableAmountOut: z.number().nullable(),
    orderInfo: orderInfoSchema,
    isThroughPoolOrCurve: z.boolean(),
  }).array(),
  assetNameMapping: z.record(z.string()).optional(), // address to ERC20 names
  usd: z.object({ // USD info of this swap, nullable
    aa: z.number().optional(), // available amount in, USD
    aao: z.number().optional(), // available amount out, USD
    mo: z.number().optional(), // market amount out, USD
    mi: z.number().optional(), // market amount in, USD
    d: z.string().optional(), // difference in available amount in/out (USD) and market amount out/in (USD) in percentage
  }).optional(),
  autoSlippage: z.number().optional(),
});

const swapInfoByAmountIn = swapInfoBase.extend({
  availableAmountOut: z.null(),
  availableAmountIn: z.number(),
  marketAmountOut: z.number().nullable(),
  marketAmountIn: z.null(),
}).transform((val) => ({
  ...val,
  isTradeBuy: false as const,
}));

const swapInfoByAmountOut = swapInfoBase.extend({
  availableAmountOut: z.number(),
  availableAmountIn: z.null(),
  marketAmountOut: z.null(),
  marketAmountIn: z.number().nullable(),
}).transform((val) => ({
  ...val,
  isTradeBuy: true as const,
}));

const swapInfoSchema = swapInfoByAmountIn.or(swapInfoByAmountOut);

export default swapInfoSchema;
