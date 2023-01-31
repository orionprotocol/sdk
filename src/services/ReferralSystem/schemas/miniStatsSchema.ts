import { z } from 'zod';

const miniStatsSchema = z.object({
  earned_on_referrals_orn: z.number(),
  earned_on_referrals_usd: z.number(),
  orn_usd: z.number(),
  registered_via_link_count: z.number(),
  earned_in_a_week_orn: z.number(),
  earned_in_a_week_usd: z.number(),
});

export default miniStatsSchema;
