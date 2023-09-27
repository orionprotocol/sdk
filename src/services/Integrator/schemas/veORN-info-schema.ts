import { z } from 'zod';
import { evmAddressSchema } from './util-schemas.js';
import infoSchema from './info-schema.js';

const veORNResultSchema = z.object({
  avgAPR: z.number(),
  minAPR: z.number(),
  maxAPR: z.number(),
  veTOKENAddress: evmAddressSchema,
  totalORNLocked: z.number(),
  totalVeORN: z.number(),
  weekly_reward: z.number(),
  userAPR: z.number(),
  userVeORN: z.number(),
  userORNLocked: z.number(),
  userPeriodLock: z.number(),
  userReward: z.number(),
  userWeeklyReward: z.number()
});

const veORNInfoSchema = z.object({
  result: veORNResultSchema,
  info: infoSchema,
});

export default veORNInfoSchema;
