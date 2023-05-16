import { z } from 'zod';

const poolsLpAndStakedSchema = z.record(
  z.object({
    unstakedLPBalance: z.string(),
    stakedLPBalance: z.string(),
  }),
);

export default poolsLpAndStakedSchema;
