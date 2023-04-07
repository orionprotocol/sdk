import { z } from 'zod';

const claimInfoSchema = z.object({
  global: z.object({
    total_non_accrued: z.number(),
  }),
  current_chain: z.object({
    total_accrued: z.number(),
    total_non_accrued: z.number(),
    total_earned: z.number()
  }),
});

export default claimInfoSchema;
