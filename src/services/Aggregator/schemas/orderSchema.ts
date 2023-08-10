import { ethers } from 'ethers';
import { z } from 'zod';
import { exchanges, orderStatuses, subOrderStatuses } from '../../../constants/index.js';

const blockchainOrderSchema = z.object({
  id: z.string().refine(ethers.utils.isHexString, (value) => ({
    message: `blockchainOrder.id must be a hex string, got ${value}`,
  })),
  senderAddress: z.string().refine(ethers.utils.isAddress, (value) => ({
    message: `blockchainOrder.senderAddress must be an address, got ${value}`,
  })),
  matcherAddress: z.string().refine(ethers.utils.isAddress, (value) => ({
    message: `blockchainOrder.matcherAddress must be an address, got ${value}`,
  })),
  baseAsset: z.string().refine(ethers.utils.isAddress, (value) => ({
    message: `blockchainOrder.baseAsset must be an address, got ${value}`,
  })),
  quoteAsset: z.string().refine(ethers.utils.isAddress, (value) => ({
    message: `blockchainOrder.quoteAsset must be an address, got ${value}`,
  })),
  matcherFeeAsset: z.string().refine(ethers.utils.isAddress, (value) => ({
    message: `blockchainOrder.matcherFeeAsset must be an address, got ${value}`,
  })),
  amount: z.number().int().nonnegative(),
  price: z.number().int().nonnegative(),
  matcherFee: z.number().int().nonnegative(),
  nonce: z.number(),
  expiration: z.number(),
  buySide: z.union([z.literal(1), z.literal(0)]),
  signature: z.string().refine(ethers.utils.isHexString, (value) => ({
    message: `blockchainOrder.signature must be a hex string, got ${value}`,
  })).nullable(),
  isPersonalSign: z.boolean(),
  needWithdraw: z.boolean(),
});

const tradeInfoSchema = z.object({
  tradeId: z.string().uuid(),
  tradeStatus: z.enum(['NEW', 'PENDING', 'OK', 'FAIL', 'TEMP_ERROR', 'REJECTED']),
  filledAmount: z.number().nonnegative(),
  price: z.number().nonnegative(),
  creationTime: z.number(),
  updateTime: z.number(),
  matchedBlockchainOrder: blockchainOrderSchema.optional(),
  matchedSubOrderId: z.number().int().nonnegative().optional(),
  exchangeTradeInfo: z.boolean(),
  poolTradeInfo: z.boolean(),
});

const baseOrderSchema = z.object({
  assetPair: z.string().toUpperCase(),
  side: z.enum(['BUY', 'SELL']),
  amount: z.number().nonnegative(),
  remainingAmount: z.number().nonnegative(),
  price: z.number().nonnegative(),
  sender: z.string().refine(ethers.utils.isAddress, (value) => ({
    message: `order.sender must be an address, got ${value}`,
  })),
  filledAmount: z.number().nonnegative(),
  internalOnly: z.boolean(),
})

const selfBrokers = exchanges.map((exchange) => `SELF_BROKER_${exchange}` as const);
type SelfBroker = typeof selfBrokers[number];
const isSelfBroker = (value: string): value is SelfBroker => selfBrokers.some((broker) => broker === value);

const selfBrokerSchema = z.custom<SelfBroker>((value) => {
  if (typeof value === 'string' && isSelfBroker(value)) {
    return true;
  }
  return false;
});

const brokerAddressSchema = z.enum([
  'INTERNAL_BROKER',
  'ORION_BROKER',
  'SELF_BROKER'
])
  .or(selfBrokerSchema)
  .or(z.string().refine(ethers.utils.isAddress, (value) => ({
    message: `subOrder.subOrders.[n].brokerAddress must be an address, got ${value}`,
  })));
const subOrderSchema = baseOrderSchema.extend({
  price: z.number(),
  id: z.number(),
  parentOrderId: z.string().refine(ethers.utils.isHexString, (value) => ({
    message: `subOrder.parentOrderId must be a hex string, got ${value}`,
  })),
  exchange: z.string(),
  brokerAddress: brokerAddressSchema,
  tradesInfo: z.record(
    z.string().uuid(),
    tradeInfoSchema
  ),
  status: z.enum(subOrderStatuses),
  complexSwap: z.boolean(),
});

const orderSchema = z.object({
  orderId: z.string().refine(ethers.utils.isHexString, (value) => ({
    message: `orderId must be a hex string, got ${value}`,
  })),
  order: baseOrderSchema.extend({
    id: z.string().refine(ethers.utils.isHexString, (value) => ({
      message: `order.id must be a hex string, got ${value}`,
    })),
    fee: z.number().nonnegative(),
    feeAsset: z.string().toUpperCase(),
    creationTime: z.number(),
    blockchainOrder: blockchainOrderSchema,
    subOrders: z.record(subOrderSchema),
    updateTime: z.number(),
    status: z.enum(orderStatuses),
    settledAmount: z.number().nonnegative(),
  })
});

export default orderSchema;
