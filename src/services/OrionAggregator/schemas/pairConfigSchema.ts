import { z } from 'zod';

const pairConfigSchema = z.object({
  baseAssetPrecision: z.number().int(),
  executableOnBrokersPriceDeviation: z.number().nullable(),
  maxPrice: z.number(),
  maxQty: z.number(),
  minPrice: z.number(),
  minQty: z.number(),
  name: z.string(),
  pricePrecision: z.number().int(),
  qtyPrecision: z.number().int(),
  quoteAssetPrecision: z.number().int(),
});

export default pairConfigSchema;
