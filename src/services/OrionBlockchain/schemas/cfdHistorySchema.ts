import { z } from 'zod';

const cfdHistoryItem = z.object({
  _id: z.string(),
  __v: z.number(),
  address: z.string(),
  instrument: z.string(),
  instrumentAddress: z.string(),
  balance: z.string(),
  position: z.string(),
  reason: z.enum(['WITHDRAW', 'DEPOSIT']),
  positionPrice: z.string(),
  fundingRate: z.string(),
  transactionHash: z.string(),
  blockNumber: z.number(),
  createdAt: z.number(),
});

const cfdHistorySchema = z.object({
  success: z.boolean(),
  count: z.number(),
  total: z.number(),
  pagination: z.object({}),
  data: z.array(cfdHistoryItem),
});

export default cfdHistorySchema;
