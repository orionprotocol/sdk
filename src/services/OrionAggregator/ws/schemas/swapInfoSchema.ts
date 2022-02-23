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
  p: z.number(), // price
  mo: z.number(), // market amount out
  mp: z.number(), // market price
  ma: z.number(), // min amount
  aa: z.number(), // available amount in
  ps: z.string().array(), // path
  po: z.boolean(), // is swap through pool optimal
});

export default swapInfoSchema;
