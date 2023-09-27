import { z } from 'zod';
import MessageType from '../MessageType.js';
import baseMessageSchema from './baseMessageSchema.js';

const alternativeSchema = z.object({ // execution alternatives
  e: z.string().array(), // exchanges
  ps: z.string().array(), // path
  mo: z.number().optional(), // market amount out
  mi: z.number().optional(), // market amount in
  mp: z.number(), // market price
  aa: z.number().optional(), // available amount in
  aao: z.number().optional(), // available amount out
});
const swapInfoSchemaBase = baseMessageSchema.extend({
  T: z.literal(MessageType.SWAP_INFO),
  S: z.string(), // swap request id
  ai: z.string().toUpperCase(), // asset in,
  ao: z.string().toUpperCase(), // asset out
  a: z.number(), // amount in
  o: z.number(), // amount out
  ma: z.number(), // min amount in
  mao: z.number(), // min amount out
  ps: z.string().array(), // path
  po: z.boolean(), // is swap through pool optimal
  e: z.string().array().optional(), // Exchanges
  p: z.number().optional(), // price
  mp: z.number().optional(), // market price
  oi: z.object({ //  info about order equivalent to this swap
    p: z.string().toUpperCase(), // asset pair
    s: z.enum(['SELL', 'BUY']), // side
    a: z.number(), // amount
    sp: z.number(), // safe price (with safe deviation but without slippage)
  }).optional(),
  as: alternativeSchema.array(),
  anm: z.record(z.string()).optional(), // address to ERC20 names
  eps: z.array(z.object({
    p: z.string(), // pool address
    ai: z.string().toUpperCase(), // asset in
    ao: z.string().toUpperCase(), // asset out
    f: z.string(), // factory
  }))
});

const swapInfoSchemaByAmountIn = swapInfoSchemaBase.extend({
  mo: z.number().optional(), // market amount out
  aa: z.number(), // available amount in
}).transform((content) => ({
  ...content,
  k: 'exactSpend' as const,
}));

const swapInfoSchemaByAmountOut = swapInfoSchemaBase.extend({
  mi: z.number().optional(), // market amount in
  aao: z.number(), // available amount out
}).transform((content) => ({
  ...content,
  k: 'exactReceive' as const,
}));

const swapInfoSchema = z.union([
  swapInfoSchemaByAmountIn,
  swapInfoSchemaByAmountOut,
]);

export default swapInfoSchema;
