import { z } from 'zod';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const pingPongMessageSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.PING_PONG),
});

export default pingPongMessageSchema;
