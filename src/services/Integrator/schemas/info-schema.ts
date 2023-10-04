import { z } from 'zod';
import { ethers } from 'ethers';

const infoSchema = z.object({
  blockNumber: z.number().int().nonnegative(),
  blockHash: z.string().refine((v) => v.length === 0 || ethers.isHexString(v), {
    message: 'blockHash must be a valid hex string or empty',
  }),
  timeRequest: z.number().int().nonnegative(),
  timeAnswer: z.number().int().nonnegative(),
  changes: z.number().int().nonnegative(),
});

export default infoSchema;
