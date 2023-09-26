import { z } from 'zod';

const distinctAnalyticsSchema = z.object({
  referer: z.string(),
  refs_info: z.record(
    z.string(),
    z.object({
      referral_address: z.string(),
      referral_earned_fees: z.number(),
      referer_earned_fees: z.number(),
      relative_ref_level: z.number(),
      reward_record_hash: z.string(),
      timestamp: z.number(),
      latest_timestamp: z.number(),
      latest_block: z.number(),
    }),
  ),
  total_sent_to_governance: z.number(),
  total_earned: z.number(),
  total_volume: z.number(),
  total_trades: z.number(),
  all_time_earnings_boost_only: z.number(),
  all_time_earnings_boost_only_usd: z.number(),
  all_time_earnings: z.number(),
  all_time_earnings_usd: z.number(),
  all_weekly_earnings: z.number(),
  all_weekly_earnings_usd: z.number(),
});

export default distinctAnalyticsSchema;
