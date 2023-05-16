import { z } from 'zod';

const pairConfigSchema = z.object({
  // baseAssetPrecision: z.number().int(), // Deprecated. DO NOT USE
  // executableOnBrokersPriceDeviation: z.number().nullable(), // Deprecated. DO NOT USE
  maxPrice: z.number(),
  maxQty: z.number(),
  minPrice: z.number(),
  minQty: z.number(),
  name: z.string().toUpperCase(),
  pricePrecision: z.number().int(),
  qtyPrecision: z.number().int(),
  // quoteAssetPrecision: z.number().int(), // Deprecated. DO NOT USE
});

export default pairConfigSchema;
