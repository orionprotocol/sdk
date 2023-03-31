import { z } from 'zod';
import MessageType from '../MessageType.js';
import baseMessageSchema from './baseMessageSchema.js';

const initMessageSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.INITIALIZATION),
  i: z.string(),
});

export default initMessageSchema;
