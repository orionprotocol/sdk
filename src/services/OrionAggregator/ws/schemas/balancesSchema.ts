import { z } from 'zod';
import { makePartial } from '../../../../utils';

const balancesSchema = z.record( // changed balances in format
  z.string(), // asset
  z.tuple([
    z.string(), // tradable balance
    z.string(), // reserved balance
  ]),
).transform(makePartial);
export default balancesSchema;
