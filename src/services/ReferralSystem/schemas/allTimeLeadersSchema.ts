import { z } from 'zod';

const allTimeLeadersSchema = z.array(z.object({
  wallet: z.string(),
  total_earnings_fmt: z.number(),
  referrals_count_fmt: z.number(),
  total_trades_fmt: z.number(),
  weekly_earnings_fmt: z.number(),
}));

export default allTimeLeadersSchema;
