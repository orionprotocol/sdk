import { z } from 'zod';

const swapInfoSchema = z.object({
  amountIn: z.number(),
  amountOut: z.number(),
  assetIn: z.string(),
  assetOut: z.string(),
  marketPrice: z.number().nullable(), // spending asset market price
  availableAmountIn: z.number(), // available spending asset amount
  // executionInfo: z.array(z.string()),
  isThroughPoolOptimal: z.boolean(),
  path: z.array(z.string()),
  price: z.number().nullable(), // spending asset price
});

export default swapInfoSchema;
