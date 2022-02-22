import { z } from 'zod';

const balancesSchema = z.object({
  contractBalances: z.record(z.string()).optional(),
  walletBalances: z.record(z.string()),
  allowances: z.record(z.string()).optional(),
});

export default balancesSchema;
