import { z } from 'zod';

const aggregatedHistorySchema = z.array(z.object({
  history_type: z.object({
    RewardDistribution: z.string()
  }),
  chain_type: z.string(),
  chain_comp: z.string(),
  date_unix: z.number(),
  date_time_local: z.string(),
  date_time_utc: z.string(),
  amount_orn: z.string(),
  amount_orn_fmt: z.number(),
  amount_usd: z.string(),
  amount_usd_fmt: z.number(),
  orn_price: z.string(),
  orn_price_fmt: z.number()
}))

export default aggregatedHistorySchema;
