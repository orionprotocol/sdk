import { z } from 'zod';
import uppercasedNetworkCodes from '../../../constants/uppercasedNetworkCodes.js';
import redeemOrderSchema from './redeemOrderSchema.js';

export const atomicSwapHistorySchema = z.array(z.object({
  id: z.string(),
  sender: z.string(),
  lockOrder: z.object({
    sender: z.string(),
    asset: z.string().toUpperCase(),
    amount: z.number(),
    expiration: z.number(),
    secretHash: z.string(),
    used: z.boolean(),
    sourceNetworkCode: z.enum(uppercasedNetworkCodes),
  }),
  redeemOrder: redeemOrderSchema,
  status: z.enum(['SETTLED', 'EXPIRED', 'ACTIVE']),
  creationTime: z.number(),
}));

export default atomicSwapHistorySchema;
