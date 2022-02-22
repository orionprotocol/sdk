import { z } from 'zod';

const errorSchema = z.object({
  error: z.object({
    code: z.number(),
    reason: z.string(),
  }),
  timestamp: z.string(),
});

export default errorSchema;
