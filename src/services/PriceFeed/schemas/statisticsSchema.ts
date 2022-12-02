import { z } from 'zod';

const statisticsOverview = z.object({
  volume24h: z.number(),
  volume7d: z.number(),
});

export const statisticsOverviewSchema = z.object({
  time: z.number(),
  statisticsOverview,
});

export const topPairsStatisticsSchema = z.object({
  time: z.number(),
  topPairs: z.array(
    z.object({
      assetPair: z.string(),
      statisticsOverview,
    }),
  ),
});
