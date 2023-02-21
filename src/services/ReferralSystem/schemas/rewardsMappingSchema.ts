import { z } from 'zod';

const rewardsMappingSchema = z.object({
  data: z.array(
    z.object({
      distribution: z.object({
        dist: z.object({
          orion: z.number(),
          referers_list: z.array(z.number()),
        }),
        address_to_reward_mapping: z.record(z.string(), z.number()),
        ref_offset_to_rewarded_actors: z.record(z.string(), z.string()),
        governance_reward_only: z.number(),
        total_reward: z.number(),
        trade_initiator: z.string(),
      }),
      timestamp_ms: z.number(),
      block_height: z.number(),
      tx_hash: z.string(),
      price_feed_meta_info: z
        .record(z.string(), z.record(z.string(), z.number()))
        .nullable(),
    })
  ),
  pagination_info: z.object({
    c_page: z.number().int().nonnegative(),
    t_pages: z.number().int().nonnegative(),
  }),
});

export default rewardsMappingSchema;
