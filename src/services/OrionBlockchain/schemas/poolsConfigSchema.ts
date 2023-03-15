import { z } from 'zod';
import addressSchema from '../../../addressSchema';
import { makePartial } from '../../../utils';

const poolsConfigSchema = z.object({
  WETHAddress: addressSchema.optional(),
  factoryAddress: addressSchema,
  governanceAddress: addressSchema.optional(),
  routerAddress: addressSchema,
  votingAddress: addressSchema.optional(),
  factories: z.record(
    z.string(),
    addressSchema,
  )
    .transform(makePartial)
    .optional(),
  pools: z.record(
    z.string(),
    z.object({
      lpTokenAddress: addressSchema,
      minQty: z.number().optional(),
      reverted: z.boolean().optional(),
      rewardToken: z.string().nullable().optional(),
      state: z.number().int().optional(),
      rewardTokenDecimals: z.number().int().optional(),
      stakingRewardFinish: z.number().optional(),
      stakingRewardAddress: addressSchema,
      vote_rewards_disabled: z.boolean().optional(),
    }),
  ).transform(makePartial),
});

export default poolsConfigSchema;
