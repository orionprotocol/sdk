import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';

const poolSchema = z.object({
  tokenId: evmAddressSchema,

  token0: z.string().nonempty(),
  token1: z.string().nonempty(),
  token0Address: evmAddressSchema,
  token1Address: evmAddressSchema,
  token0Decimals: z.number().int().nonnegative().max(18),
  token1Decimals: z.number().int().nonnegative().max(18),

  amount: z.number().nonnegative(),
  amount0: z.number().nonnegative(),
  amount1: z.number().nonnegative(),
  from: z.number().nonnegative(),
  to: z.number().nonnegative(),
  fee: z.number().nonnegative(),
  collectFee: z.number().nonnegative(),
  reward: z.number().nonnegative(),
  apr: z.number().nonnegative(),
  boost: z.number().int().nonnegative(),
  isStaked: z.boolean(),
  poolFee: z.number().nonnegative(),
  poolAddress: evmAddressSchema,
  veOrnForMaxBoost: z.number().nonnegative(),
  veOrnMaxBoost: z.number().nonnegative(),
  veORNCurrent: z.number().nonnegative(),
  time: z.number().int().nonnegative(), // tim
});

export default poolSchema;
