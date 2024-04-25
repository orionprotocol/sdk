import { z } from 'zod';
import { SupportedChainId } from '../../../types';

const preprocessToEnum = (value: unknown) => {
  if (typeof value === 'number') {
    return String(value);
  }
  return value;
};

export const tickerSchema = z.object({
  pair: z.string(),
  volume24: z.number(),
  change24: z.number(),
  lastPrice: z.number(),
  networks: z.array(z.preprocess(preprocessToEnum, z.nativeEnum(SupportedChainId))),
});

export const tickersSchema = z.array(tickerSchema);
