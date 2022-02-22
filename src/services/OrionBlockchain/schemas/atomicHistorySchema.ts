import { z } from 'zod';
import { OrionBlockchainAtomicHistoryStatus } from '../../..';

const atomicHistorySchema = z.object({
  success: z.boolean(),
  count: z.number(),
  total: z.number(),
  pagination: z.object({}),
  data: z.array(z.object({
    used: z.boolean(),
    claimed: z.boolean(),
    isAggApplied: z.boolean(),
    _id: z.string(),
    secretHash: z.string(),
    __v: z.number(),
    asset: z.string(),
    amountToReceive: z.number().optional(),
    amountToSpend: z.number().optional(),
    timestamp: z.object({
      lock: z.number().optional(),
      claim: z.number().optional(),
      refund: z.number().optional(),
    }).optional(),
    targetChainId: z.number().optional(),
    expiration: z.object({
      lock: z.number().optional(),
    }).optional(),
    sender: z.string(),
    state: z.nativeEnum(OrionBlockchainAtomicHistoryStatus),
    transactions: z.object({
      lock: z.string().optional(),
      redeem: z.string().optional(),
      claim: z.string().optional(),
      refund: z.string().optional(),
    }).optional(),
    type: z.enum(['target', 'source']).optional(),
    receiver: z.string().optional(),
    secret: z.string().optional(),
  })),
});

export default atomicHistorySchema;
