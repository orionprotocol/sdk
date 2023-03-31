import { z } from 'zod';
import MessageType from '../MessageType.js';
import baseMessageSchema from './baseMessageSchema.js';

const errorSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.ERROR),
  c: z.number().int(), // code
  id: z.string().optional(), // subscription id
  m: z.string(), // error message,
});

export default errorSchema;
