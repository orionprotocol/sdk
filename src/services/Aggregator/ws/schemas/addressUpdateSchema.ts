import { z } from 'zod';
import orderStatuses from '../../../../constants/orderStatuses.js';
import executionTypes from '../../../../constants/executionTypes.js';
import subOrderStatuses from '../../../../constants/subOrderStatuses.js';
import MessageType from '../MessageType.js';
import balancesSchema from './balancesSchema.js';
import baseMessageSchema from './baseMessageSchema.js';

const baseAddressUpdate = baseMessageSchema.extend({
  id: z.string(),
  T: z.literal(MessageType.ADDRESS_UPDATE),
  S: z.string(), // subscription
  uc: z.array(z.enum(['b', 'o'])), // update content
});

const subOrderSchema = z.object({
  i: z.number(), // id
  I: z.string(), // parent order id
  O: z.string(), // sender (owner)
  P: z.string().toUpperCase(), // asset pair
  s: z.enum(['BUY', 'SELL']), // side
  a: z.number(), // amount
  A: z.number(), // settled amount
  p: z.number(), // avg weighed settlement price
  e: z.string(), // exchange
  es: z.string().array().optional(), // exchanges
  b: z.string(), // broker address
  S: z.enum(subOrderStatuses), // status
  o: z.boolean(), // internal only
});

export const orderUpdateSchema = z.object({
  I: z.string(), // id
  A: z.number(), // settled amount
  S: z.enum(orderStatuses), // status
  l: z.boolean().optional(), // is liquidation order
  t: z.number(), // update time
  C: z.string().optional(), // trigger condition
  E: z.enum(executionTypes).optional(),
  c: subOrderSchema.array(),
})
  .transform((val) => ({
    ...val,
    k: 'update' as const,
  })).transform((o) => ({
    kind: o.k,
    id: o.I,
    settledAmount: o.A,
    status: o.S,
    liquidated: o.l,
    executionType: o.E,
    triggerCondition: o.C,
    subOrders: o.c.map((so) => ({
      pair: so.P,
      exchange: so.e,
      exchanges: so.es,
      id: so.i,
      amount: so.a,
      settledAmount: so.A,
      price: so.p,
      status: so.S,
      side: so.s,
      subOrdQty: so.A,
    })),
  }));

export const fullOrderSchema = z.object({
  I: z.string(), // id
  O: z.string(), // sender (owner)
  P: z.string().toUpperCase(), // asset pair
  s: z.enum(['BUY', 'SELL']), // side
  a: z.number(), // amount
  A: z.number(), // settled amount
  p: z.number(), // price
  F: z.string().toUpperCase(), // fee asset
  f: z.number(), // fee
  l: z.boolean().optional(), // is liquidation order
  L: z.number().optional(), // stop limit price,
  o: z.boolean(), // internal only
  S: z.enum(orderStatuses), // status
  T: z.number(), // creation time / unix timestamp
  t: z.number(), // update time
  c: subOrderSchema.array(),
  E: z.enum(executionTypes).optional(),
  C: z.string().optional(), // trigger condition
  ro: z.boolean().optional(), // is reversed order
  sc: z.string().optional(), // source chain
  tc: z.string().optional(), // target chain
}).transform((val) => ({
  ...val,
  k: 'full' as const,
})).transform((o) => ({
  kind: o.k,
  id: o.I,
  settledAmount: o.A,
  feeAsset: o.F,
  fee: o.f,
  liquidated: o.l,
  stopPrice: o.L,
  status: o.S,
  date: o.T,
  clientOrdId: o.O,
  type: o.s,
  pair: o.P,
  amount: o.a,
  price: o.p,
  executionType: o.E,
  triggerCondition: o.C,
  isReversedOrder: o.ro,
  sorceChain: o.sc,
  targetChain: o.tc,
  subOrders: o.c.map((so) => ({
    pair: so.P,
    exchange: so.e,
    exchanges: so.es,
    id: so.i,
    amount: so.a,
    settledAmount: so.A,
    price: so.p,
    status: so.S,
    side: so.s,
    subOrdQty: so.A,
  })),
}));

const updateMessageSchema = baseAddressUpdate.extend({
  k: z.literal('u'), // kind of message: "u" - updates
  uc: z.array(z.enum(['b', 'o'])), // update content: "o" - orders updates, "b" - balance updates
  b: balancesSchema.optional(),
  o: z.tuple([fullOrderSchema.or(orderUpdateSchema)]).optional(),
});

const initialMessageSchema = baseAddressUpdate.extend({
  k: z.literal('i'), // kind of message: "i" - initial
  b: balancesSchema,
  o: z.array(fullOrderSchema)
    .optional(), // When no orders — no field
});

const addressUpdateSchema = z.union([
  initialMessageSchema,
  updateMessageSchema,
]);

export default addressUpdateSchema;
