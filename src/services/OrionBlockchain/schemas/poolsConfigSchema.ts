import { z } from 'zod';

const poolsConfigSchema = z.object({
  WETHAddress: z.string().optional(),
  factoryAddress: z.string(),
  governanceAddress: z.string(),
  routerAddress: z.string(),
  votingAddress: z.string(),
  pools: z.record(z.object({
    lpTokenAddress: z.string(),
    minQty: z.number().optional(),
    pricePrecision: z.number().optional(),
    qtyPrecision: z.number().optional(),
    rewardToken: z.string().nullable().optional(),
    stakingRewardFinish: z.number().optional(),
    stakingRewardAddress: z.string(),
    vote_rewards_disabled: z.boolean().optional(),
  })),
});

export default poolsConfigSchema;
