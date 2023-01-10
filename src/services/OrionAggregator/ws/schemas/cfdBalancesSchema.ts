import { z } from 'zod';

const cfdBalanceSchema = z.object({
    i: z.string(),
    b: z.string(),
    p: z.string(),
    pp: z.string(),
    fr: z.string(),
    sfrl: z.string(),
    lfrl: z.string(),
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
