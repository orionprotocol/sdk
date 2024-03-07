import { z } from 'zod';
import infoSchema from './info-schema';
import { listPoolV2Schema } from './list-pool-v2-response-schema';
import { listPoolV3Schema } from './list-pool-v3-response-schema';

const listPoolResponseSchema = z.object({
  result: z.array(listPoolV2Schema.or(listPoolV3Schema)),
  info: infoSchema,
});

export default listPoolResponseSchema;
