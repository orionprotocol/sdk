import { z } from 'zod';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const unsubscriptionDoneSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.UNSUBSCRIPTION_DONE),
});

export default unsubscriptionDoneSchema;
