import { z } from 'zod';

const candlesSchema = z.object({
  candles: z.array(z.object({
    close: z.string(),
    high: z.string(),
    low: z.string(),
    open: z.string(),
    time: z.number(),
    timeEnd: z.number(),
    timeStart: z.number(),
    volume: z.string(),
  })),
  timeStart: z.number(),
  timeEnd: z.number(),
});

export default candlesSchema;
