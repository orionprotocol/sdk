import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import basicPoolInfo from './basic-pool-info-schema.js';
import infoSchema from './info-schema.js';

const poolItem = z.object({
  ...basicPoolInfo.shape,
  weeklyReward: z.number(),
  type: z.string().nonempty(),
}).or(z.null());

const poolOfListPoolSchema = z.object({
  token0: z.string().nonempty(),
  token1: z.string().nonempty(),
  name0: z.string(),
  name1: z.string(),
  token0Address: evmAddressSchema,
  token1Address: evmAddressSchema,
  totalLiquidity: z.number(),
  WETH9: evmAddressSchema,

  pools: z.object({
    1: poolItem,
    0.3: poolItem,
    0.05: poolItem,
    0.01: poolItem,
  }),
});

const listPoolV3ResponseSchema = z.object({
  result: z.array(poolOfListPoolSchema),
  info: infoSchema,
});

export default listPoolV3ResponseSchema;
