import { z } from 'zod';

const rewardsClaimedSchema = z.object({
  referer: z.string(),
  amount: z.string(),
  signature: z.string(),
});

export default rewardsClaimedSchema;
