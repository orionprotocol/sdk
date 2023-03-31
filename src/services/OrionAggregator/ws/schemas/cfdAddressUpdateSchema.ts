import { z } from 'zod';
import { fullOrderSchema, orderUpdateSchema } from './addressUpdateSchema.js';
import baseMessageSchema from './baseMessageSchema.js';
import MessageType from '../MessageType.js';
import cfdBalancesSchema from './cfdBalancesSchema.js';

const baseCfdAddressUpdate = baseMessageSchema.extend({
  id: z.string(),
  T: z.literal(MessageType.CFD_ADDRESS_UPDATE),
  S: z.string(), // subscription
  uc: z.array(z.enum(['b', 'o'])), // update content
});

const updateMessageSchema = baseCfdAddressUpdate.extend({
  k: z.literal('u'), // kind of message: "u" - updates
  uc: z.array(z.enum(['b', 'o'])), // update content: "o" - orders updates, "b" - balance updates
  b: cfdBalancesSchema.optional(),
  o: z.tuple([fullOrderSchema.or(orderUpdateSchema)]).optional(),
});

const initialMessageSchema = baseCfdAddressUpdate.extend({
  k: z.literal('i'), // kind of message: "i" - initial
  b: cfdBalancesSchema,
  o: z.array(fullOrderSchema)
    .optional(), // When no orders — no field
});

const cfdAddressUpdateSchema = z.union([
  initialMessageSchema,
  updateMessageSchema,
]);

export default cfdAddressUpdateSchema
