import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import infoSchema from './info-schema.js';

const environmentResponseSchema = z.object({
  result: z.object({
    chainId: z.number().int().nonnegative(),
    nativeToken: z.string(),
    OrionV3Factory: evmAddressSchema,
    OrionV3NFTManager: evmAddressSchema,
    SwapRouter: evmAddressSchema,
    OrionFarmV3: evmAddressSchema,
    OrionVoting: evmAddressSchema,
    veORN: evmAddressSchema,
  }),
  info: infoSchema,
});

export default environmentResponseSchema;
