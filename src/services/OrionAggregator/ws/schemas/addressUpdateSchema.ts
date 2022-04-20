import { z } from 'zod';
import orderStatuses from '../../../../constants/orderStatuses';
import subOrderStatuses from '../../../../constants/subOrderStatuses';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const baseAddressUpdate = baseMessageSchema.extend({
  T: z.literal(MessageType.ADDRESS_UPDATE),
  S: z.string(), // subscription
  uc: z.array(z.enum(['b', 'o'])), // update content
});

const subOrderSchema = z.object({
  i: z.number(), // id
  I: z.string(), // parent order id
  O: z.string(), // sender (owner)
  P: z.string(), // asset pair
  s: z.enum(['BUY', 'SELL']), // side
  a: z.number(), // amount
  A: z.number(), // settled amount
  p: z.number(), // avg weighed settlement price
  e: z.string(), // exchange
  b: z.string(), // broker address
  S: z.enum(subOrderStatuses), // status
  o: z.boolean(), // internal only
});

export const orderUpdateSchema = z.object({
  I: z.string(), // id
  A: z.number(), // settled amount
  S: z.enum(orderStatuses), // status
  t: z.number(), // update time
  c: subOrderSchema.array(),
})
  .transform((val) => ({
    ...val,
    k: 'update' as const,
  }));

export const fullOrderSchema = z.object({
  I: z.string(), // id
  O: z.string(), // sender (owner)
  P: z.string(), // asset pair
  s: z.enum(['BUY', 'SELL']), // side
  a: z.number(), // amount
  A: z.number(), // settled amount
  p: z.number(), // price
  F: z.string(), // fee asset
  f: z.number(), // fee
  o: z.boolean(), // internal only
  S: z.enum(orderStatuses), // status
  T: z.number(), // creation time / unix timestamp
  t: z.number(), // update time
  c: subOrderSchema.array(),
}).transform((val) => ({
  ...val,
  k: 'full' as const,
}));

const updateMessageSchema = baseAddressUpdate.extend({
  k: z.literal('u'),
  b: z.record(z.tuple([
    z.string(), // wallet balance
    z.string(), // exchange contract balance
  ])).optional(),
  o: z.tuple([fullOrderSchema.or(orderUpdateSchema)]).optional(),
});

const initialMessageSchema = baseAddressUpdate.extend({
  k: z.literal('i'),
  b: z.record(z.tuple([
    z.string(), // wallet balance
    z.string(), // exchange contract balance
  ])),
  o: z.array(fullOrderSchema).optional(), // When no orders — no field
});

const addressUpdateSchema = z.union([
  initialMessageSchema,
  updateMessageSchema,
]);

export default addressUpdateSchema;
