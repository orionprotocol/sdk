import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import infoSchema from './info-schema.js';

const environmentResponseSchema = z.object({
  result: z.object({
    chainId: z.number().int().nonnegative(),
    nativeToken: z.string(),
    OrionV3Factory: evmAddressSchema.optional(),
    OrionV2Factory: evmAddressSchema,
    OrionV3NFTManager: evmAddressSchema.optional(),
    SwapRouterV3: evmAddressSchema.optional(),
    OrionFarmV3: evmAddressSchema.optional(),
    OrionFarmV2: evmAddressSchema,
    OrionVoting: evmAddressSchema,
    veORN: evmAddressSchema,
    ORN: evmAddressSchema,
    WETH9: evmAddressSchema,
  }),
  info: infoSchema,
});

export default environmentResponseSchema;
