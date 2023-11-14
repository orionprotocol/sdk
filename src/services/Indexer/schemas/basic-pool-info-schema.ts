import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';

const basicPoolInfo = z.object({
  poolAddress: evmAddressSchema,
  isInitialized: z.boolean(),
  liquidity: z.number().nonnegative(),
  liquidityInUSD: z.number().nonnegative(),
  liquidityShare: z.number().nonnegative(),
  isFarming: z.boolean(),
  rewardsTotal: z.number().nonnegative(),
  rewardsPerPeriod: z.number().nonnegative(),
  rewardsShare: z.number().nonnegative(),
  feePerPeriod: z.number().nonnegative(),
  feeTotal: z.number().nonnegative(),
  feeShare: z.number().nonnegative(),
  tickMultiplier: z.number().nonnegative(),
  MAX_TICK: z.number().nonnegative().int(),
  minAPR: z.number().nonnegative(),
  maxAPR: z.number().nonnegative(),
  avgAPR: z.number().nonnegative(),
  maxBoost: z.number().nonnegative().int(),
  feeRate: z.array(z.number().nonnegative()),
});

export default basicPoolInfo;
