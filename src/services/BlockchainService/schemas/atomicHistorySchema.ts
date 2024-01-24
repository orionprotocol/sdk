import { ethers } from 'ethers';
import { z } from 'zod';
import getValidArrayItemsSchema from '../../../utils/getValidArrayItems.js';

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
  sender: z.string().refine(ethers.isAddress),
  secretHash: z.string().refine(ethers.isHexString),
  receiver: z.string().refine(ethers.isAddress).optional(),
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
  state: z.enum(['BEFORE-LOCK', 'LOCKED', 'REFUNDED', 'CLAIMED']).optional(),
  targetChainId: z.number(),
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
  state: z.enum(['BEFORE-REDEEM', 'REDEEMED']).optional(),
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
  data: getValidArrayItemsSchema(
    z.discriminatedUnion('type', [sourceAtomicHistorySchemaItem, targetAtomicHistorySchemaItem]),
  ),
});

export default atomicHistorySchema;
