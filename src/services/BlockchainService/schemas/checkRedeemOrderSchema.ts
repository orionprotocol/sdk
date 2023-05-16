import { z } from 'zod';

const checkRedeemOrderSchema = z.object({
  redeemTxHash: z.string(),
  secret: z.string().nullable(),
  secretHash: z.string(),
});

export default checkRedeemOrderSchema;
