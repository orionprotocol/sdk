import { z } from 'zod';
import poolSchema from './pool-schema.js';
import infoSchema from './info-schema.js';

const listNFTOrderResponseSchema = z.object({
  result: z.array(poolSchema),
  info: infoSchema,
});

export default listNFTOrderResponseSchema;
