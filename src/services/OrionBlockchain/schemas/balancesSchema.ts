import { z } from 'zod';
import { makePartial } from '../../../utils';

const balancesSchema = z.object({
  contractBalances: z.record(z.string()).transform(makePartial).optional(),
  walletBalances: z.record(z.string()).transform(makePartial),
  allowances: z.record(z.string()).transform(makePartial).optional(),
});

export default balancesSchema;
