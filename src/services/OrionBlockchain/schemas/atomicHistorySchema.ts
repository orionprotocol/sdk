import { z } from 'zod';

const baseAtomicHistorySchema = z.object({
  success: z.boolean(),
  count: z.number(),
  total: z.number(),
  pagination: z.object({}),
});

const baseAtomicHistoryItem = z.object({
  used: z.boolean(),
  claimed: z.boolean(),
  isAggApplied: z.boolean(),
  _id: z.string(),
  __v: z.number(),
  asset: z.string(),
  sender: z.string(),
  secretHash: z.string(),
  receiver: z.string().optional(),
  secret: z.string().optional(),
});

const sourceAtomicHistorySchemaItem = baseAtomicHistoryItem.extend({
  type: z.literal('source'),
  amountToReceive: z.number().optional(),
  amountToSpend: z.number().optional(),
  timestamp: z.object({
    lock: z.number().optional(),
    claim: z.number().optional(),
    refund: z.number().optional(),
  }).optional(),
  expiration: z.object({
    lock: z.number().optional(),
  }).optional(),
  state: z.enum(['LOCKED', 'REFUNDED', 'CLAIMED']),
  targetChainId: z.number().optional(),
  transactions: z.object({
    lock: z.string().optional(),
    claim: z.string().optional(),
    refund: z.string().optional(),
  }).optional(),
});

const targetAtomicHistorySchemaItem = baseAtomicHistoryItem.extend({
  type: z.literal('target'),
  timestamp: z.object({
    redeem: z.number().optional(),
  }).optional(),
  expiration: z.object({
    redeem: z.number().optional(),
  }).optional(),
  state: z.enum(['REDEEMED', 'BEFORE-REDEEM']),
  transactions: z.object({
    redeem: z.string().optional(),
  }).optional(),
});

export const sourceAtomicHistorySchema = baseAtomicHistorySchema.extend({
  data: z.array(sourceAtomicHistorySchemaItem),
});

export const targetAtomicHistorySchema = baseAtomicHistorySchema.extend({
  data: z.array(targetAtomicHistorySchemaItem),
});

const atomicHistorySchema = baseAtomicHistorySchema.extend({
  data: z.array(
    z.discriminatedUnion('type', [sourceAtomicHistorySchemaItem, targetAtomicHistorySchemaItem]),
  ),
});

export default atomicHistorySchema;
