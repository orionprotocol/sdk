import { z } from "zod";
import { evmAddressSchema } from "./util-schemas.js";
import infoSchema from "./info-schema.js";

const veORNResultSchema = z.object({
  avgAPR: z.number(),
  minAPR: z.number(),
  maxAPR: z.number(),
  veTokenAddress: evmAddressSchema,
  totalORNLocked: z.number(),
  totalVeORN: z.number(),
  weeklyReward: z.number(),
  userAPR: z.number(),
  userVeORN: z.number(),
  userORNLocked: z.number(),
  userLockEndDate: z.number(),
  userReward: z.number(),
  userWeeklyReward: z.number(),
  userMinLockPeriod: z.number(),
  dropLock: z.boolean(),
  pointsReward: z.number(),
});

const veORNInfoSchema = z.object({
  result: veORNResultSchema,
  info: infoSchema,
});

export default veORNInfoSchema;
