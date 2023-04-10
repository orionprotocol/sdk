import { z } from 'zod';

const cfdContractsSchema = z.array(z.object({
  name: z.string(),
  alias: z.string(),
  address: z.string(),
  leverage: z.number(),
  soLevel: z.number(),
  shortFR: z.number(),
  longFR: z.number(),
  shortFRStored: z.number(),
  longFRStored: z.number(),
  lastFRPriceUpdateTime: z.number(),
  priceIndex: z.number(),
  feePercent: z.number(),
  withdrawMarginLevel: z.number(),
  delegateContractAddress: z.string(),
}));

export default cfdContractsSchema;
