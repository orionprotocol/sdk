import { z } from 'zod';
import { networkCodes } from '../../../constants';

const volumeInfoSchema = z.object({
  volume24: z.number(),
  volume7d: z.number(),
  volumeAllTime: z.number(),
  networks: z.array(z.enum(networkCodes)),
})

const supplyMetricsSchema = z.object({
  circulatingSupply: z.number(),
  totalSupply: z.number(),
  maxSupply: z.number(),
})

const governanceMetricsSchema = z.object({
  totalLumiaLocked: z.number(),
  totalVeLumia: z.number(),
  totalVeLumiaInVoting: z.number(),
  weeklyLumiaReward: z.number(),
  networks: z.array(z.enum(networkCodes)),
})

export const aggregatedMetricsSchema = z.object({
  volumeInfo: volumeInfoSchema,
  supplyMetrics: supplyMetricsSchema,
  governanceMetrics: governanceMetricsSchema
});
