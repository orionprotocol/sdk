import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import basicPoolInfo from './basic-pool-info-schema.js';
import infoSchema from './info-schema.js';

// This is a crutch. In the nearest future Yuriy will update his model and we need to replace this constant with basicPoolInfo
const omittedBasicPoolInfo = basicPoolInfo.omit({ feeRate: true })

const poolOfListPoolSchema = z.object({
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
  farmAddress: z.string(),
  weight: z.number(),
  liquidity0: z.number(),
  liquidity1: z.number(),
  liquidityInUSD: z.number(),
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
  feeRate: z.number().nonnegative(),

  ...omittedBasicPoolInfo.shape,

  type: z.string().nonempty(),
});

const listPoolV2ResponseSchema = z.object({
  result: z.array(poolOfListPoolSchema),
  info: infoSchema,
});

export default listPoolV2ResponseSchema;
