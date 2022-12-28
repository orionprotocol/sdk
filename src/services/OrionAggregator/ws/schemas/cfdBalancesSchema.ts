import { z } from 'zod';

const cfdBalanceSchema = z.object({
    i: z.string(),
    b: z.number(),
    p: z.number(),
    pp: z.number(),
    fr: z.number(),
    sfrl: z.number(),
    lfrl: z.number(),
})
  .transform((obj) => ({
    instrument: obj.i,
    balance: obj.b,
    position: obj.p,
    positionPrice: obj.pp,
    fundingRate: obj.fr,
    lastShortFundingRate: obj.sfrl,
    lastLongFundingRate: obj.lfrl,
}));

const cfdBalancesSchema = z.array(cfdBalanceSchema)

export default cfdBalancesSchema;
