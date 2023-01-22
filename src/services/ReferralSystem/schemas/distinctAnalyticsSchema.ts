import { z } from 'zod';

const distinctAnalyticsSchema = z.object({
  referer: z.string(),
  refs_info: z.object({
    latest_block: z.number(),
    latest_timestamp: z.number(),
    referer_earned_fees: z.number(),
    referral_address: z.string(),
    referral_earned_fees: z.number(),
    relative_ref_level: z.number(),
    reward_record_hash: z.string(),
    timestamp: z.number(),
  }),
  total_earned: z.number(),
  total_sent_to_governance: z.number(),
});

export default distinctAnalyticsSchema;
