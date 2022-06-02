import { z } from 'zod';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const unsubscriptionDoneSchema = baseMessageSchema.extend({
  id: z.string(),
  T: z.literal(MessageType.UNSUBSCRIPTION_DONE),
});

export default unsubscriptionDoneSchema;
