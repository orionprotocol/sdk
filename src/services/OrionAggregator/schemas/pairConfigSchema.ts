import { z } from 'zod';

const pairConfigSchema = z.object({
  baseAssetPrecision: z.number(),
  executableOnBrokersPriceDeviation: z.number().nullable(),
  maxPrice: z.number(),
  maxQty: z.number(),
  minPrice: z.number(),
  minQty: z.number(),
  name: z.string(),
  pricePrecision: z.number(),
  qtyPrecision: z.number(),
  quoteAssetPrecision: z.number(),
});

export default pairConfigSchema;
