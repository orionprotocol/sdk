import { z } from 'zod';

const governanceContractsSchema = z.object({
  controllerAddress: z.string(),
  veTOKENAddress: z.string(),
  veTOKENYieldDistributorV4Address: z.string(),
  time_total: z.string(),
  absolute_ve_token_in_voting: z.string(),
  info: z.record(
    z.string(),
    z.object({
      gaugeAddress: z.string(),
      gaugeType: z.number(),
      gaugeName: z.string(),
    })
  ),
});

export default governanceContractsSchema;
