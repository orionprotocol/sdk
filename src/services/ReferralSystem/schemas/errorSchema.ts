import { z } from 'zod';

const errorSchema = z.object({
  status: z.string(),
  message: z.string(),
});

export default errorSchema;
