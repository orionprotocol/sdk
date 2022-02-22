import { z } from 'zod';
import orderStatuses from '../../../../constants/orderStatuses';
import subOrderStatuses from '../../../../constants/subOrderStatuses';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const baseAddressUpdate = baseMessageSchema.extend({
  T: z.literal(MessageType.ADDRESS_UPDATE),
  S: z.string(), // subscription
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
  uc: z.array(z.enum(['b', 'o'])),
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

// const addressUpdateSchema = z.object({
//   T: z.string(),
//   _: z.number(),
//   S: z.string(),
//   b: z.record(z.tuple([z.string(), z.string()])).optional(),
//   o: z.array(
//     z.object({
//       I: z.string(), // id
//       O: z.string().optional(), // sender (owner)
//       P: z.string().optional(), // asset pair
//       s: z.enum(['BUY', 'SELL']).optional(), // side
//       a: z.number().optional(), // amount
//       A: z.number(), // settled amount
//       p: z.number().optional(), // price
//       F: z.string().optional(), // fee asset
//       f: z.number().optional(), // fee
//       o: z.boolean().optional(), // internal only
//       S: z.enum(orderStatuses).optional(), // status
//       T: z.number().optional(), // creation time
//       t: z.number(), // update time
//       c: z
//         .object({
//           i: z.number(), // id
//           I: z.string(), // parent order id
//           O: z.string(), // sender (owner)
//           P: z.string(), // asset pair
//           s: z.enum(['BUY', 'SELL']), // side
//           a: z.number(), // amount
//           A: z.number(), // settled amount
//           p: z.number(), // avg weighed settlement price
//           e: z.string(), // exchange
//           b: z.string(), // broker address
//           S: z.enum(subOrderStatuses), // status
//           o: z.boolean(), // internal only
//         })
//         .array(),
//     }),
//   ).optional(),
// });

export default addressUpdateSchema;
