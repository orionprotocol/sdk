import { z } from 'zod';

const governancePoolsSchema = z.array(
  z.object({
    identifier: z.string(),
    chain: z.string(),
    platform: z.string(),
    logo: z.string(),
    pair: z.string(),
    lp_address: z.string(),
    farm_address: z.string(),
    pool_tokens: z.tuple([z.string(), z.string()]),
    pool_rewards: z.array(z.string()),
    liquidity_locked: z.number(),
    base_apy: z.number(),
    max_apy: z.number(),
    reward_per_week: z.number(),
  })
);

export default governancePoolsSchema;
