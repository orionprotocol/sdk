import { z } from 'zod';

const historySchema = z.array(z.object(
  {
    amount: z.string(),
    amountNumber: z.string(),
    asset: z.string(),
    assetAddress: z.string(),
    contractBalance: z.string().nullable().optional(),
    createdAt: z.number(),
    transactionHash: z.string(),
    type: z.enum(['deposit', 'withdrawal']),
    user: z.string(),
    walletBalance: z.string().nullable().optional(),
  },
));

export default historySchema;
