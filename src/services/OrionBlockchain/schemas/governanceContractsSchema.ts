import { z } from 'zod';

const governanceContractsSchema = z.array(
  z.object({
    controllerAddress: z.string(),
    veORNAddress: z.string(),
    veORNYieldDistributorV4Address: z.string(),
    orionGaugeORNRewardsDistributorAddress: z.string(),
    time_total: z.string(),
    info: z.record(
      z.string(),
      z.object({
        gaugeAddress: z.string(),
        gaugeType: z.number(),
        gaugeName: z.string(),
      })
    ),
  })
);

export default governanceContractsSchema;
