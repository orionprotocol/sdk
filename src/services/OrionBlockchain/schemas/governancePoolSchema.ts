import { z } from 'zod';

const governancePoolSchema = z.object({
  base_apr: z.number(),
  max_apr: z.number(),
  tvl: z.string(),
  lp_supply: z.string(),
  lp_staked: z.string(),
  lp_staked_with_boost: z.string(),
  lp_price_in_usd: z.string(),
  reward_per_period: z.number(),
  lock_time_for_max_multiplier: z.string(),
  lock_max_multiplier: z.string(),
  veorn_max_multiplier: z.string(),
  veorn_boost_scale_factor: z.string(),
});

export default governancePoolSchema;
