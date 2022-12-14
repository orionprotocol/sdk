import { z } from 'zod';
import exchanges from '../../../../constants/exchanges';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

export const orderBookItemSchema = z.tuple([
  z.string(), // price
  z.string(), // size
  z.array(
    z.enum(exchanges),
  ), // exchanges
  z.array(z.tuple([
    z.enum(['SELL', 'BUY']), // side
    z.string(), // pairname
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
