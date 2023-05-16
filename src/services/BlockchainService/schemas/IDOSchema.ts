import { z } from 'zod';

const IDOSchema = z.object({
  amount: z.number().or(z.null()),
  amountInWei: z.number().or(z.null()),
  amountInUSDT: z.number().or(z.null()),
  address: z.string(),
});

export default IDOSchema;
