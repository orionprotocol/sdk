import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import infoSchema from './info-schema.js';

const environmentResponseSchema = z.object({
  result: z.object({
    chainId: z.number().int().nonnegative(),
    nativeToken: z.string(),
    ORN: evmAddressSchema,
    WETH9: evmAddressSchema,
    OrionV3Factory: evmAddressSchema.optional(),
    OrionV2Factory: evmAddressSchema.optional(),
    OrionV3NFTManager: evmAddressSchema.optional(),
    SwapRouterV3: evmAddressSchema.optional(),
    OrionFarmV3: evmAddressSchema.optional(),
    OrionFarmV2: evmAddressSchema.optional(),
    OrionVoting: evmAddressSchema.optional(),
    veORN: evmAddressSchema.optional(),
  }),
  info: infoSchema,
});

export default environmentResponseSchema;
