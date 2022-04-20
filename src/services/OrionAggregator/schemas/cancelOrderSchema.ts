import { z } from 'zod';

const cancelOrderSchema = z.object({
  orderId: z.union([z.number(), z.string()]),
  cancellationRequests: z.array(z.object({
    amount: z.number(),
    brokerAddress: z.string(),
    exchange: z.string(),
  })).optional(),
  remainingAmount: z.number().optional(),
});

export default cancelOrderSchema;
