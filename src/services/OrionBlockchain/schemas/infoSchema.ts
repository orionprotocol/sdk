import { z } from 'zod';

const infoSchema = z.object({
  chainId: z.number(),
  chainName: z.string(),
  exchangeContractAddress: z.string(),
  oracleContractAddress: z.string(),
  matcherAddress: z.string(),
  orderFeePercent: z.number(),
  assetToAddress: z.record(z.string()),
  assetToDecimals: z.record(z.number()),
  assetToIcons: z.record(z.string()).optional(),
});

export default infoSchema;
