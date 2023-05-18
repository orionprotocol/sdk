import { z } from 'zod';

const candleSchema = z
  .tuple([
    z.string(), // interval [FIVE, FIFTEEN, THIRTY, HOUR, HOUR4, DAY, WEEK]
    z.string(), // pair ["btc-usdt"]
    z.number(), // timeStart [timestamp]
    z.number(), // timeEnd [timestamp]
    z.string(), // close
    z.string(), // open
    z.string(), // high
    z.string(), // low
    z.string(), // volume
  ])
  .transform(
    ([interval, pair, timeStart, timeEnd, close, open, high, low, volume]) => ({
      interval,
      pair,
      timeStart,
      timeEnd,
      close,
      open,
      high,
      low,
      volume,
    }),
  );

export default candleSchema;
