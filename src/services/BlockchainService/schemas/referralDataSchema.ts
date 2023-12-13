import { z } from "zod";

export const referralDataSchema = z.object({
  referer: z.string(),
  isReferral: z.boolean(),
});
