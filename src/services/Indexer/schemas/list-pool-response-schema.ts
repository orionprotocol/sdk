import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import basicPoolInfo from './basic-pool-info-schema.js';
import infoSchema from './info-schema.js';

const poolOfListPoolSchema = z.object({
  token0: z.string().nonempty(),
  token1: z.string().nonempty(),
  token0Address: evmAddressSchema,
  token1Address: evmAddressSchema,

  token0Decimals: z.number().int().nonnegative().max(18),
  token1Decimals: z.number().int().nonnegative().max(18),
  WETH9: evmAddressSchema,

  ...basicPoolInfo.shape,

  type: z.string().nonempty(),
});

const listPoolResponseSchema = z.object({
  result: z.array(poolOfListPoolSchema),
  info: infoSchema,
});

export default listPoolResponseSchema;
