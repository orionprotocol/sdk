import { z } from 'zod';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

export const orderBookItemSchema = z.tuple([
  z.string(), // price
  z.string(), // size
  z.array(z.string()), // exchanges
]);

export const orderBookSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.AGGREGATED_ORDER_BOOK_UPDATE),
  S: z.string(),
  ob: z.object({
    a: z.array(orderBookItemSchema),
    b: z.array(orderBookItemSchema),
  }),
});
