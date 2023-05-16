import { z } from 'zod';
import MessageType from '../MessageType.js';
import baseMessageSchema from './baseMessageSchema.js';

const pingPongMessageSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.PING_PONG),
});

export default pingPongMessageSchema;
