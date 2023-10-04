import { z } from 'zod';
import infoSchema from './info-schema.js';

const poolSchema = z.object({
  allVote: z.number(),
  name: z.string(),
  poolAddress: z.string(),
  type: z.string(),
  userVote: z.number()
})

const votingResultSchema = z.object({
  absoluteVeTokenInVoting: z.number(),
  pools: z.array(poolSchema),
  userVeTokenBalance: z.number(),
  userVeTokenInVoting: z.number(),
  veTokenAddress: z.string(),
  votingAddress: z.string(),
  weeklyReward: z.number()
})

const votingInfoSchema = z.object({
  result: votingResultSchema,
  info: infoSchema,
});

export default votingInfoSchema;
