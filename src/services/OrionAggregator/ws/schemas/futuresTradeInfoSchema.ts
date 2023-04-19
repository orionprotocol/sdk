import { z } from 'zod';
import MessageType from '../MessageType.js';

const futuresTradeInfoSchema = z.object({
  T: z.literal(MessageType.FUTURES_TRADE_INFO_UPDATE),
  id: z.string(), // trade info request UUID, set by client side
  S: z.string(), // sender
  i: z.string(), // instrument
  bp: z.number().optional(), // buy price
  sp: z.number().optional(), // sell price
  bpw: z.number(), // buy power
  spw: z.number(), // sell power
  ma: z.number(), // min amount
});

export default futuresTradeInfoSchema;
