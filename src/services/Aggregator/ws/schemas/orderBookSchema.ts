import { z } from 'zod';
import MessageType from '../MessageType.js';
import baseMessageSchema from './baseMessageSchema.js';

export const orderBookItemSchema = z.tuple([
  z.string(), // price
  z.string(), // size
  z.array(
    z.string(),
  ), // exchanges
  z.array(z.tuple([
    z.enum(['SELL', 'BUY']), // side
    z.string().toUpperCase(), // pairname
  ])),
]);

export const orderBookSchema = baseMessageSchema.extend({
  // id: z.string(),
  T: z.literal(MessageType.AGGREGATED_ORDER_BOOK_UPDATE),
  S: z.string(),
  ob: z.object({
    a: z.array(orderBookItemSchema),
    b: z.array(orderBookItemSchema),
  }),
});
