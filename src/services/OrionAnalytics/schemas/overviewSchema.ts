import { z } from 'zod';

const overviewSchema = z.object({
  volume24h: z.number(),
  volume7d: z.number(),
  transactionCount24h: z.number(),
  transactionCount7d: z.number(),
});

export default overviewSchema;
