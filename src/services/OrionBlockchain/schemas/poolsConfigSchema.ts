import { ethers } from 'ethers';
import { z } from 'zod';
import { makePartial } from '../../../utils';

const poolsConfigSchema = z.object({
  WETHAddress: z.string().optional(),
  factoryAddress: z.string(),
  governanceAddress: z.string(),
  routerAddress: z.string(),
  votingAddress: z.string().optional(),
  factories: z.record(
    z.string(),
    z.string().refine(ethers.utils.isAddress, 'Factory should be an address'),
  )
    .transform(makePartial)
    .optional(),
  pools: z.record(
    z.string(),
    z.object({
      lpTokenAddress: z.string(),
      minQty: z.number().optional(),
      pricePrecision: z.number().int().optional(),
      qtyPrecision: z.number().int().optional(),
      reverted: z.boolean().optional(),
      rewardToken: z.string().nullable().optional(),
      state: z.number().int().optional(),
      rewardTokenDecimals: z.number().int().optional(),
      stakingRewardFinish: z.number().optional(),
      stakingRewardAddress: z.string(),
      vote_rewards_disabled: z.boolean().optional(),
    }),
  ).transform(makePartial),
});

export default poolsConfigSchema;
