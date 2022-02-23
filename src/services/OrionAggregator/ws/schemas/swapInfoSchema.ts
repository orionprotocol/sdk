import { z } from 'zod';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const swapInfoSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.SWAP_INFO),
  S: z.string(), // swap request id
  ai: z.string(), // asset in,
  a: z.string(), // amount in
  ao: z.string(), // asset out
  o: z.string(), // amount out
  p: z.string(), // price
  mo: z.string(), // market amount out
  mp: z.string(), // market price
  ma: z.string(), // min amount
  aa: z.string(), // available amount in
  ps: z.string().array(), // path
  po: z.boolean(), // is swap through pool optimal
});

export default swapInfoSchema;
