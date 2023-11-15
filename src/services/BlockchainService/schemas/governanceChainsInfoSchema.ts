import { z } from 'zod';

const governanceChainsInfoSchema = z.object({
  isChainSupported: z.boolean(),
});

export default governanceChainsInfoSchema;
