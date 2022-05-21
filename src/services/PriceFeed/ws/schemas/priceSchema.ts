import { z } from 'zod';

const priceSchema = z.tuple([
  z.number(), // unix timestamp
  z.string(), // pair
  z.number(), // price
]).transform(([, pair, price]) => ({ pair, price }));

export default priceSchema;
