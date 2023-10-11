import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import basicPoolInfo from './basic-pool-info-schema.js';
import infoSchema from './info-schema.js';

const getPoolResponseSchema = z.object({
  result: z.object({
    token0: z.string().nonempty(),
    token1: z.string().nonempty(),
    token0Address: evmAddressSchema,
    token1Address: evmAddressSchema,

    totalLiquidity: z.number().nonnegative(),
    WETH9: evmAddressSchema,
    pools: z.record(z.number(), basicPoolInfo.nullable()),
  }),
  info: infoSchema,
});

export default getPoolResponseSchema;
