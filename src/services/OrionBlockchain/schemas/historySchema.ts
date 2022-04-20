import { z } from 'zod';

const historySchema = z.array(z.object(
  {
    amount: z.string(),
    amountNumber: z.string(),
    asset: z.string(),
    assetAddress: z.string(),
    contractBalance: z.string().optional(),
    createdAt: z.number(),
    transactionHash: z.string(),
    type: z.string(),
    user: z.string(),
    walletBalance: z.string().optional(),
    __v: z.number(),
    _id: z.string(),
  },
));

export default historySchema;
