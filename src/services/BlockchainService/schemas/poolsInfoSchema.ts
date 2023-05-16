import { z } from 'zod';

const poolsInfoSchema = z.object({
  governance: z.object({
    apr: z.string(),
    rewardRate: z.string(),
    totalBalance: z.string(),
  }),
  totalRewardRatePerWeek: z.string(),
  pools: z.record(
    z.object({
      currentAPR: z.string(),
      isUser: z.boolean().optional(),
      price: z.string(),
      reserves: z.record(z.string()),
      totalLiquidityInDollars: z.string(),
      totalRewardRatePerWeek: z.string(),
      totalStakedAmountInDollars: z.string(),
      totalSupply: z.string(),
      totalVoted: z.string(),
      weight: z.string(),
    }),
  ),
});

export default poolsInfoSchema;
