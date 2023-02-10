import { z } from 'zod';
import { networkCodes } from '../../constants';
import { SupportedChainId } from '../../types';

export const pureChainInfoPayloadSchema = z.object({
  chainId: z.nativeEnum(SupportedChainId),
  label: z.string(),
  shortName: z.string(),
  code: z.enum(networkCodes),
  explorer: z.string(),
  rpc: z.string(),
  baseCurrencyName: z.string(),
});

export const pureChainInfoSchema = z.record(
  z.nativeEnum(SupportedChainId),
  pureChainInfoPayloadSchema,
);
