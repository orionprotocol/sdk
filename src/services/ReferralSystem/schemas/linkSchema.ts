import { z } from 'zod';

const linkSchema = z.object({
  status: z.string(),
  referer: z.string(),
});

export default linkSchema;
