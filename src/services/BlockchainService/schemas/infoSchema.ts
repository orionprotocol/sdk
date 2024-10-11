import { z } from 'zod';
import { makePartial } from '../../../utils';

const internalFeeAssetSchema = z.object({
  type: z.enum(['percent', 'plain']),
  value: z.number(),
  asset: z.string(),
});

const infoSchema = z.object({
  chainId: z.number(),
  chainName: z.string(),
  swapExecutorContractAddress: z.string(),
  libValidatorContractAddress: z.string().optional(),
  exchangeContractAddress: z.string(),
  spvContractAddress: z.string().optional(),
  oracleContractAddress: z.string(),
  matcherAddress: z.string(),
  orderFeePercent: z.number(),
  assetToAddress: z.record(z.string()).transform(makePartial),
  assetToDecimals: z.record(z.number()).transform(makePartial),
  assetToIcons: z.record(z.string()).transform(makePartial).optional(),
  cexTokens: z.string().array(),
  internalFeeAssets: internalFeeAssetSchema.array().optional(),
});

export default infoSchema;
