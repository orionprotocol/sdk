import { z } from 'zod';
import { makePartial } from '../../../utils/index.js';

export const pricesWithQuoteAssetSchema = z.object({
  quoteAsset: z.string(),
  prices: z.record(z.string()).transform(makePartial)
});
