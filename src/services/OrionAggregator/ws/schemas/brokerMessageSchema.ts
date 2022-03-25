import { z } from 'zod';
import MessageType from '../MessageType';
import baseMessageSchema from './baseMessageSchema';

const brokerMessageSchema = baseMessageSchema.extend({
  T: z.literal(MessageType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATE),
  bb: z.array(
    z.tuple([
      z.string(), // Asset name
      z.number(), // limit
    ]),
  ),
});

export default brokerMessageSchema;
