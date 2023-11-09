import { z } from 'zod';
import infoSchema from './info-schema.js';

const testIncrementorSchema = z.object({
  result: z.number().int(),
  info: infoSchema,
});

export default testIncrementorSchema;
