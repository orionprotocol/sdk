import { z } from 'zod';
import positionStatuses from '../../../../constants/positionStatuses';
import executionTypes from '../../../../constants/cfdExecutionTypes';

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
    l: z.string(),
    s: z.enum(positionStatuses),
    lfrs: z.string(),
    lfrd: z.string(),
    sfrs: z.string(),
    sfrd: z.string(),
    sop: z.string().optional(),
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
    leverage: obj.l,
    status: obj.s,
    longFundingRatePerSecond: obj.lfrs,
    longFundingRatePerDay: obj.lfrd,
    shortFundingRatePerSecond: obj.sfrs,
    shortFundingRatePerDay: obj.sfrd,
    stopOutPrice: obj.sop,
  }));

const cfdBalancesSchema = z.array(cfdBalanceSchema);

export default cfdBalancesSchema;
