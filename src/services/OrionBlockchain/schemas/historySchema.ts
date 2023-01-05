import { z } from 'zod';
import { HistoryTransactionStatus } from '../../../types';

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
)).transform((response) => {
  return response.map((item) => {
    const {
      type, createdAt, transactionHash, user,
    } = item;
    return {
      type,
      date: createdAt * 1000,
      token: item.asset,
      amount: item.amountNumber,
      status: HistoryTransactionStatus.DONE,
      transactionHash,
      user,
    };
  });
});

export default historySchema;
