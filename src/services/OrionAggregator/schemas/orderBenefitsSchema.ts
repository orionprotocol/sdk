import { z } from 'zod';

const orderBenefitsSchema = z.record(z.object({
  benefitBtc: z.string(),
  benefitPct: z.string(),
}));

export default orderBenefitsSchema;
