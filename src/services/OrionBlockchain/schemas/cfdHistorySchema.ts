import { z } from 'zod';

const cfdHistorySchema = z.array(z.object({
  address: z.string(),
  instrument: z.string(),
  balance: z.string(),
  position: z.string(),
  reason: z.string(),
  positionPrice: z.string(),
  fundingRate: z.string(),
  transactionHash: z.string(),
  blockNumber: z.number(),
}));

export default cfdHistorySchema;
