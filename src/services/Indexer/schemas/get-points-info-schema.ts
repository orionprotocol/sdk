import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import infoSchema from './info-schema.js';

const getPointsResultSchema = z.object({
  avgAPR: z.number(),
  minAPR: z.number(),
  maxAPR: z.number(),
  veTokenAddress: evmAddressSchema,
  totalPointsLocked: z.number(),
  totalPoints: z.number(),
  weeklyReward: z.number(),
  userAPR: z.number(),
  userPoints: z.number(),
  userPointsLocked: z.number(),
  userLockEndDate: z.number(),
  userReward: z.number(),
  userWeeklyReward: z.number(),
  userMinLockPeriod: z.number(),
});

const getPointsInfoSchema = z.object({
  result: getPointsResultSchema,
  info: infoSchema,
}).nullable();

export default getPointsInfoSchema;
