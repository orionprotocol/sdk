import { z } from 'zod';
import tickerInfoSchema from './tickerInfoSchema.js';

type TickerInfo = z.infer<typeof tickerInfoSchema>

const allTickersSchema = z.unknown().array()
  .transform((tickers) => {
    const data = [...tickers];
    data.shift();
    const parsedData = tickerInfoSchema.array().parse(data);
    return parsedData.reduce<
      Partial<
        Record<
          string,
          TickerInfo
        >
      >
    >((prev, pairData) => ({
      ...prev,
      [pairData.pairName]: pairData,
    }), {});
  });

export default allTickersSchema;
