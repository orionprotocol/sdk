import { z } from 'zod';

export const dueLiabilityEstimateSchema = z.object({
  asset: z.string(),
  amount: z.number().nonnegative(),
});
