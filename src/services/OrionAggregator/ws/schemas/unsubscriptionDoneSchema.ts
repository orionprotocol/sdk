import { z } from 'zod';
import MessageType from '../MessageType.js';
import baseMessageSchema from './baseMessageSchema.js';

const unsubscriptionDoneSchema = baseMessageSchema.extend({
  id: z.string(),
  T: z.literal(MessageType.UNSUBSCRIPTION_DONE),
});

export default unsubscriptionDoneSchema;
