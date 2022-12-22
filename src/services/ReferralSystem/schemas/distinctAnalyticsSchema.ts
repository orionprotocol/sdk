import { z } from 'zod';

const distinctAnalyticsSchema = z.object({
  referer: z.string(),

  refs_info: z.array(
    z.object({
      referral_address: z.string(),
      referral_earned_fees: z.number(),
      referer_earned_fees: z.number(),
      relative_ref_level: z.number(),
      timestamp: z.number(),
    }),
  ),
});

export default distinctAnalyticsSchema;
