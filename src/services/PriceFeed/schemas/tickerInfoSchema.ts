import { z } from 'zod';

const tickerInfoSchema = z.tuple([
  z.string(), // pair name
  z.string(), // lastPrice
  z.string(), // openPrice
  z.string(), // high price
  z.string(), // low price
  z.string(), // volume 24h
]);

export default tickerInfoSchema;
