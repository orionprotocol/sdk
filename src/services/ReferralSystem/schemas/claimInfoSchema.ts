import { z } from 'zod';

const claimInfoSchema = z.object({
  global: z.object({
    total_non_accrued: z.number(),
    total_non_accrued_token: z.number(),
    total_non_accrued_usd: z.number()
  }),
  chain_to_reward_info: z.record(
    z.string(),
    z.object({
      total_accrued: z.number(),
      total_accrued_token: z.number(),
      total_accrued_usd: z.number(),
      total_non_accrued: z.number(),
      total_non_accrued_token: z.number(),
      total_non_accrued_usd: z.number(),
      total_earned: z.number()
    })
  ),
  mini_stats: z.object({
    earned_on_referrals_token: z.number(),
    earned_on_referrals_usd: z.number(),
    token_usd: z.number(),
    registered_via_link_count: z.number(),
    earned_in_a_week_token: z.number(),
    earned_in_a_week_usd: z.number()
  }),
});

export default claimInfoSchema;
