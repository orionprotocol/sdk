import { z } from 'zod';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const initMessageSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.INITIALIZATION),
  i: z.string(),
});

export default initMessageSchema;
