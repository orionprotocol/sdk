import { z } from 'zod';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const errorSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.ERROR),
  c: z.number().int(), // code
  id: z.string(), // subscription id
  m: z.string(), // error message,
});

export default errorSchema;
