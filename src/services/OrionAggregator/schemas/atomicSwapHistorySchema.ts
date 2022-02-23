import { z } from 'zod';
import redeemOrderSchema from './redeemOrderSchema';

enum BackendStatus {
  SETTLED = 'SETTLED',
  EXPIRED = 'EXPIRED',
  ACTIVE = 'ACTIVE',
}

export const atomicSwapHistorySchema = z.array(z.object({
  id: z.string(),
  sender: z.string(),
  lockOrder: z.object({
    sender: z.string(),
    asset: z.string(),
    amount: z.number(),
    expiration: z.number(),
    secretHash: z.string(),
    used: z.boolean(),
    sourceNetworkCode: z.string(),
  }),
  redeemOrder: redeemOrderSchema,
  status: z.nativeEnum(BackendStatus),
  creationTime: z.number(),
}));

export default atomicSwapHistorySchema;
