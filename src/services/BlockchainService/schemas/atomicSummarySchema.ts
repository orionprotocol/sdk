import { z } from 'zod';

export default z.object({
  amount: z.number(),
  count: z.number(),
});
