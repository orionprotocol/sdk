import { z } from 'zod';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const swapInfoSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.SWAP_INFO),
  S: z.string(), // swap request id
  ai: z.string(), // asset in,
  ao: z.string(), // asset out
  a: z.number(), // amount in
  o: z.number(), // amount out
  p: z.number().optional(), // price
  mo: z.number().optional(), // market amount out
  mp: z.number().optional(), // market price
  ma: z.number(), // min amount
  aa: z.number(), // available amount in
  ps: z.string().array(), // path
  po: z.boolean(), // is swap through pool optimal
  oi: z.object({ //  info about order equivalent to this swap
    p: z.string(), // asset pair
    s: z.enum(['SELL', 'BUY']), // side
    a: z.number(), // amount
    sp: z.number(), // safe price (with safe deviation but without slippage)
  }),
});

export default swapInfoSchema;
