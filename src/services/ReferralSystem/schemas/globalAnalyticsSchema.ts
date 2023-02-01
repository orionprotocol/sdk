import { z } from 'zod';

const globalAnalyticsSchema = z.object({
  ref_to_rewards: z.record(z.string(), z.number()),
  total_earned_by_refs: z.number(),
  total_sent_to_governance: z.number(),
  reward_dist_count_in_general: z.record(z.string(), z.number()),
  total_ref_system_actors: z.number(),
});

export default globalAnalyticsSchema;
