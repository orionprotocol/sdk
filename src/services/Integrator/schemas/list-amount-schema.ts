import { z } from 'zod';
import infoSchema from './info-schema.js';

const listAmountSchema = z.object({
  result: z.record(z.number()),
  info: infoSchema,
});

export default listAmountSchema;
