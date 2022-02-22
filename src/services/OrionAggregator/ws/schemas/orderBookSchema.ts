import { z } from 'zod';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const orderBookSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.AGGREGATED_ORDER_BOOK_UPDATE),
  S: z.string(),
  ob: z.object({
    a: z.array(z.tuple([
      z.string(),
      z.string(),
      z.array(z.string()),
    ])),
    b: z.array(z.tuple([
      z.string(),
      z.string(),
      z.array(z.string()),
    ])),
  }),
});

export default orderBookSchema;
