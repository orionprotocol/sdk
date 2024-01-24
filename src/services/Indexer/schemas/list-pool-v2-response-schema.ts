import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import basicPoolInfo from './basic-pool-info-schema.js';
import infoSchema from './info-schema.js';

export const listPoolV2Schema = z.object({
  pair: z.string(),
  token0: z.string().nonempty(),
  token1: z.string().nonempty(),
  name: z.string(),
  name0: z.string(),
  name1: z.string(),
  token0Address: evmAddressSchema,
  token1Address: evmAddressSchema,
  token0Decimals: z.number().int().nonnegative().max(18),
  token1Decimals: z.number().int().nonnegative().max(18),
  WETH9: evmAddressSchema,
  farmAddress: z.string().optional(),
  weight: z.number(),
  liquidity0: z.number(),
  liquidity1: z.number(),
  token0Price: z.number(),
  token1Price: z.number(),
  totalLPSupply: z.number(),
  totalLPStake: z.number(),
  totalLPStakeInUSD: z.number(),
  userLPStaked: z.number(),
  userLPStakedInUSD: z.number(),
  lpPriceInUSD: z.number(),
  lpPriceInORN: z.number(),
  userReward: z.number(),
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
  userRewardToPool: z.number(),
  boostTotalVeORN: z.number(),
  boostCurrentPoolReward: z.number(),
  boostTotalLiquidity: z.number(),
  boostCurrentLiquidity: z.number(),
  boostCurrentVeORN: z.number(),
  boostTotalReward: z.number(),

  ...basicPoolInfo.shape,

  type: z.string().nonempty(),
});

const listPoolV2ResponseSchema = z.object({
  result: z.array(listPoolV2Schema),
  info: infoSchema,
});

export default listPoolV2ResponseSchema;
