import { z } from 'zod';
import { networkCodes } from '../../constants/index.js';
import { SupportedChainId } from '../../types.js';

export const pureChainInfoPayloadSchema = z.object({
  chainId: z.nativeEnum(SupportedChainId),
  label: z.string(),
  shortName: z.string(),
  code: z.enum(networkCodes),
  explorer: z.string(),
  rpc: z.string(),
  baseCurrencyName: z.string(),
  contracts: z.record(z.string(), z.string())
});

export const pureChainInfoSchema = z.record(
  z.nativeEnum(SupportedChainId),
  pureChainInfoPayloadSchema,
);
