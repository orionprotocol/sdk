import { z } from 'zod';

const addPoolSchema = z.object({
  poolAddress: z.string(),
  tokenAIcon: z.string().optional(),
  tokenAName: z.string().optional(),
  tokenBIcon: z.string().optional(),
  tokenBName: z.string().optional(),
});

export default addPoolSchema;
