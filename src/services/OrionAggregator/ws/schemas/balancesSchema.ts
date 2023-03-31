import { z } from 'zod';
import { makePartial } from '../../../../utils/index.js';

const balancesSchema = z.record( // changed balances in format
  z.string(), // asset
  z.tuple([
    z.string(), // tradable balance
    z.string(), // reserved balance
    z.string(), // contract balance
    z.string(), // wallet balance
    z.string(), // allowance
  ]),
).transform(makePartial);
export default balancesSchema;
