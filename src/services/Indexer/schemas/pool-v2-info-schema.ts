import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import basicPoolInfo from './basic-pool-info-schema';
import infoSchema from './info-schema.js';

const poolInfoSchema = z.object({
  pair: z.string(),
  name: z.string(),
  token0: z.string(),
  token1: z.string(),
  name0: z.string(),
  name1: z.string(),
  token0Address: evmAddressSchema,
  token1Address: evmAddressSchema,
  token0Decimals: z.number().int().nonnegative().max(18),
  token1Decimals: z.number().int().nonnegative().max(18),
  WETH9: z.string(),
  farmAddress: z.string().optional(),
  weight: z.number(),
  liquidity0: z.number(),
  liquidity1: z.number(),
  token0Price: z.number(),
  token1Price: z.number(),
  userLPBalance: z.number(),
  userLPBalanceStr: z.string(),
  totalLPSupply: z.number(),
  totalLPStake: z.number(),
  totalLPStakeInUSD: z.number(),
  userLPStaked: z.number(),
  userLPStakedInUSD: z.number(),
  lpPriceInUSD: z.number(),
  lpPriceInORN: z.number(),
  userReward: z.number(),
  userWeeklyReward: z.number(),
  userRewardToPool: z.number(),
  weeklyReward: z.number(),
  userAPR: z.number(),
  lockMaxMultiplier: z.number(),
  veornMaxMultiplier: z.number(),
  veornBoostScaleFactor: z.number(),
  lockTimeForMaxMultiplier: z.number(),
  userBoost: z.number(),
  userTimeDeposit: z.number(),
  userLockTimeStart: z.number(),
  userLockTimePeriod: z.number(),
  userVeORN: z.number(),
  userORN: z.number(),
  boostTotalVeORN: z.number(),
  boostCurrentPoolReward: z.number(),
  boostTotalLiquidity: z.number(),
  boostCurrentLiquidity: z.number(),
  boostCurrentVeORN: z.number(),
  boostTotalReward: z.number(),
  type: z.literal('v2'),

  ...basicPoolInfo.shape,
});

const PoolV2InfoResponseSchema = z.object({
  result: poolInfoSchema,
  info: infoSchema,
});

export default PoolV2InfoResponseSchema;
