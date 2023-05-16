import { z } from 'zod';

const placeAtomicSwapSchema = z.object({
  redeemOrder: z.object({
    amount: z.number(),
    asset: z.string().toUpperCase(),
    expiration: z.number(),
    receiver: z.string(),
    secretHash: z.string(),
    sender: z.string(),
    signature: z.string(),
    claimReceiver: z.string(),
  }),
  secretHash: z.string(),
  sender: z.string(),
});

export default placeAtomicSwapSchema;
