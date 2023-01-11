import { z } from 'zod';

const cfdBalanceSchema = z.object({
    i: z.string(),
    b: z.string(),
    pnl: z.string(),
    fr: z.string(),
    e: z.string(),
    p: z.string(),
    pp: z.string(),
    r: z.string(),
    m: z.string(),
    mu: z.string(),
    fmu: z.string(),
    awb: z.string(),
})
  .transform((obj) => ({
    instrument: obj.i,
    balance: obj.b,
    profitLoss: obj.pnl,
    fundingRate: obj.fr,
    equity: obj.e,
    position: obj.p,
    positionPrice: obj.pp,
    reserves: obj.r,
    margin: obj.m,
    marginUSD: obj.mu,
    freeMarginUSD: obj.fmu,
    availableWithdrawBalance: obj.awb,
}));

const cfdBalancesSchema = z.array(cfdBalanceSchema)

export default cfdBalancesSchema;
