import { z } from 'zod';

const poolSchema = z.object({
  allVote: z.number(),
  name: z.string(),
  poolAddress: z.string(),
  type: z.string(),
  userVote: z.number()
})

const votingInfoSchema = z.object({
  absoluteVeTokenInVoting: z.number(),
  pools: z.array(poolSchema),
  userVeTokenBalance: z.number(),
  userVeTokenInVoting: z.number(),
  veTokenAddress: z.string(),
  votingAddress: z.string(),
  weeklyReward: z.number()
})

export default votingInfoSchema;
