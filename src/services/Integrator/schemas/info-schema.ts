import { z } from 'zod';
import { hexStringSchema } from './util-schemas.js';

const infoSchema = z.object({
  blockNumber: z.number().int().nonnegative(),
  blockHash: hexStringSchema,
  timeRequest: z.number().int().nonnegative(),
  timeAnswer: z.number().int().nonnegative(),
  changes: z.number().int().nonnegative(),
});

export default infoSchema;
