import { z } from 'zod';

const eip712DomainSchema = z.object({
  name: z.string(),
  version: z.string(),
  chainId: z.string(),
  verifyingContract: z.string(),
  salt: z.string(),
})
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'At least one property should be filled in.',
  );

export default eip712DomainSchema;
