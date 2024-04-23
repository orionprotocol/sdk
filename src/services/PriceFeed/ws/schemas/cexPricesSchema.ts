import { z } from 'zod';

const cexPriceTickerInfoSchema = z.tuple([
  z.string(), // pair name
  z.number(), // lastPrice
]).transform(([pairName, lastPrice]) => ({
  pairName:pairName.toUpperCase(),
  lastPrice,
}));

type CEXPriceTickerInfo = z.infer<typeof cexPriceTickerInfoSchema>

const cexPricesSchema = z.unknown().array()
.transform((tickers) => {
  const data = [...tickers];
  data.shift();
  const parsedData = cexPriceTickerInfoSchema.array().parse(data);
  return parsedData.reduce<
    Partial<
      Record<
        string,
        CEXPriceTickerInfo
      >
    >
  >((prev, pairData) => ({
    ...prev,
    [pairData.pairName]: pairData,
  }), {});
});

export default cexPricesSchema;