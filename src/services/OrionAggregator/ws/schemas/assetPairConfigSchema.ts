import { z } from 'zod';
import MessageType from '../MessageType.js';
import baseMessageSchema from './baseMessageSchema.js';

const assetPairConfigSchema = baseMessageSchema.extend({
  id: z.string(),
  T: z.literal(MessageType.ASSET_PAIR_CONFIG_UPDATE),
  k: z.enum(['i', 'u']),
  u: z.tuple([
    z.string(), // pairName
    z.number(), // minQty
    z.number().int(), // pricePrecision
  ]),
});

export default assetPairConfigSchema;
