import { z } from 'zod';
import { makePartial } from '../../../utils';

const infoSchema = z.object({
  chainId: z.number(),
  chainName: z.string(),
  exchangeContractAddress: z.string(),
  oracleContractAddress: z.string(),
  matcherAddress: z.string(),
  orderFeePercent: z.number(),
  assetToAddress: z.record(z.string()).transform(makePartial),
  assetToDecimals: z.record(z.number()).transform(makePartial),
  assetToIcons: z.record(z.string()).transform(makePartial).optional(),
});

export default infoSchema;
