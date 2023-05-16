import { z } from 'zod';

const redeemOrderSchema = z.object({
  asset: z.string().toUpperCase(),
  amount: z.number(),
  secretHash: z.string(),
  sender: z.string(),
  receiver: z.string(),
  expiration: z.number(),
  signature: z.string(),
  claimReceiver: z.string(),
});

export default redeemOrderSchema;
