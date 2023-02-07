import { z } from 'zod';
import positionStatuses from '../../../../constants/positionStatuses';

const cfdBalanceSchema = z
  .object({
    i: z.string(),
    b: z.string(),
    pnl: z.string(),
    fr: z.string(),
    e: z.string(),
    p: z.string(),
    cp: z.string(),
    pp: z.string(),
    r: z.string(),
    m: z.string(),
    mu: z.string(),
    fmu: z.string(),
    awb: z.string(),
    mli: z.string(),
    msi: z.string(),
    l: z.string(),
    s: z.enum(positionStatuses),
  })
  .transform((obj) => ({
    instrument: obj.i,
    balance: obj.b,
    profitLoss: obj.pnl,
    fundingRate: obj.fr,
    equity: obj.e,
    position: obj.p,
    currentPrice: obj.cp,
    positionPrice: obj.pp,
    reserves: obj.r,
    margin: obj.m,
    marginUSD: obj.mu,
    freeMarginUSD: obj.fmu,
    availableWithdrawBalance: obj.awb,
    maxAvailableLong: obj.mli,
    maxAvailableShort: obj.msi,
    leverage: obj.l,
    status: obj.s,
  }));

const cfdBalancesSchema = z.array(cfdBalanceSchema);

export default cfdBalancesSchema;
