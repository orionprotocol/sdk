import { z } from 'zod';
import MessageType from '../MessageType';

const baseMessageSchema = z.object({
  T: z.nativeEnum(MessageType),
  id: z.string().optional(),
  _: z.number(),
});

export default baseMessageSchema;
