import { z } from 'zod';
import MessageType from '../MessageType.js';
import baseMessageSchema from './baseMessageSchema.js';

const assetPairsConfigSchema = baseMessageSchema.extend({
  id: z.string(),
  T: z.literal(MessageType.ASSET_PAIRS_CONFIG_UPDATE),
  k: z.enum(['i', 'u']),
  u: z.array(
    z.tuple([
      z.string().toUpperCase(), // pairName
      z.number(), // minQty
      z.number().int(), // pricePrecision
    ]),
  ),
});

export default assetPairsConfigSchema;
