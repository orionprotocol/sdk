import { z } from 'zod';

export const errorSchema = z.object({
  error: z.object({
    code: z.number(),
    reason: z.string(),
  }),
  timestamp: z.string(),
});
