import { z } from 'zod';

const governancePoolsSchema = z.array(
  z.object({
    slug: z.string(),
    identifier: z.string(),
    chain: z.string(),
    platform: z.string(),
    logo: z.string(),
    pair: z.string(),
    lp_address: z.string(),
    lp_staked: z.string(),
    lp_staked_with_boost: z.string(),
    lp_supply: z.string(),
    lp_price_in_usd: z.string(),
    farm_address: z.string(),
    pool_tokens: z.tuple([z.string(), z.string()]),
    pool_rewards: z.array(z.string()),
    tvl: z.string(),
    min_apr: z.string(),
    max_apr: z.string(),
    reward_per_period: z.array(z.string()),
    weight: z.string(),
    liquidity: z.string(),
  })
);

export default governancePoolsSchema;
