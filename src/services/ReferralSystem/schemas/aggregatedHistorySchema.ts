import { z } from 'zod';

const aggregatedHistorySchema = z.object({
  data: z.array(z.object({
    history_type: z.string(),
    chain_type: z.string(),
    chain_comp: z.string(),
    chain_id: z.number(),
    date_unix: z.number(),
    date_time_local: z.string(),
    date_time_utc: z.string(),
    amount_token: z.string(),
    amount_token_fmt: z.number(),
    amount_usd: z.string(),
    amount_usd_fmt: z.number(),
    token_price: z.string(),
    token_price_fmt: z.number()
  })),
  pagination_info: z.object({
    c_page: z.number(),
    t_pages: z.number()
  })
})

export default aggregatedHistorySchema;
