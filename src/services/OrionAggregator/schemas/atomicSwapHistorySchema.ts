import { z } from 'zod';
import redeemOrderSchema from './redeemOrderSchema';

export enum backendStatus {
  SETTLED = 'SETTLED',
  EXPIRED = 'EXPIRED',
  ACTIVE = 'ACTIVE',
}

const atomicSwapHistorySchema = z.array(z.object({
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
  status: z.nativeEnum(backendStatus),
  creationTime: z.number(),
}));

export default atomicSwapHistorySchema;
