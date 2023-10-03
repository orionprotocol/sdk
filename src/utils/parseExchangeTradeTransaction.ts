import { Exchange__factory } from '@orionprotocol/contracts/lib/ethers-v6/index.js';
import { ethers } from 'ethers';
import { z } from 'zod';

const swapThroughOrionPoolSchema = z.object({
  name: z.literal('swapThroughOrionPool'),
  args: z.tuple([
    z.bigint(), // amount_spend
    z.bigint(), // amount_receive
    z.string().refine(ethers.isAddress).array().nonempty(), // path
    z.boolean(), // is_exact_spend
  ]),
}).transform((data) => ({
  name: data.name,
  args: {
    amount_spend: data.args[0],
    amount_receive: data.args[1],
    path: data.args[2],
    is_exact_spend: data.args[3],
  },
}));

const buyOrderSchema = z.tuple([ // buy order
  z.string().refine(ethers.isAddress), // senderAddress
  z.string().refine(ethers.isAddress), // matcherAddress
  z.string().refine(ethers.isAddress), // baseAsset
  z.string().refine(ethers.isAddress), // quoteAsset
  z.string().refine(ethers.isAddress), // matcherFeeAsset
  z.bigint(), // amount
  z.bigint(), // price
  z.bigint(), // matcherFee
  z.bigint(), // nonce
  z.bigint(), // expiration
  z.literal(1), // buySide
  z.boolean(), // isPersonalSign
  z.string().refine(ethers.isHexString), // signature
]);
const sellOrderSchema = z.tuple([ // sell orer
  z.string().refine(ethers.isAddress), // senderAddress
  z.string().refine(ethers.isAddress), // matcherAddress
  z.string().refine(ethers.isAddress), // baseAsset
  z.string().refine(ethers.isAddress), // quoteAsset
  z.string().refine(ethers.isAddress), // matcherFeeAsset
  z.bigint(), // amount
  z.bigint(), // price
  z.bigint(), // matcherFee
  z.bigint(), // nonce
  z.bigint(), // expiration
  z.literal(0), // buySide
  z.boolean(), // isPersonalSign
  z.string().refine(ethers.isHexString), // signature
]);

const toOrder = <T extends z.infer<typeof buyOrderSchema> | z.infer<typeof sellOrderSchema>>(data: T) => ({
  senderAddress: data[0],
  matcherAddress: data[1],
  baseAsset: data[2],
  quoteAsset: data[3],
  matcherFeeAsset: data[4],
  amount: data[5],
  price: data[6],
  matcherFee: data[7],
  nonce: data[8],
  expiration: data[9],
  buySide: data[10],
  isPersonalSign: data[11],
  signature: data[12],
});

const fillThroughOrionPoolSchema = z.object({
  name: z.literal('fillThroughOrionPool'),
  args: z.tuple([
    sellOrderSchema,
    z.bigint(), // filled amount
    z.bigint(), // blockchainFee
    z.string().refine(ethers.isAddress).array().nonempty(), // path
  ]),
}).transform((data) => ({
  name: data.name,
  args: {
    order: toOrder(data.args[0]),
    filledAmount: data.args[1],
    blockchainFee: data.args[2],
    path: data.args[3],
  },
}));

const fillOrdersSchema = z.object({
  name: z.literal('fillOrders'),
  args: z.tuple([
    buyOrderSchema,
    sellOrderSchema,
    z.bigint(), // filledPrice
    z.bigint(), // filledAmount
  ]),
}).transform((data) => ({
  name: data.name,
  args: {
    orders: {
      buyOrder: toOrder(data.args[0]),
      sellOrder: toOrder(data.args[1]),
    },
    filledPrice: data.args[2],
    filledAmount: data.args[3],
  },
}));

export default function parseExchangeTradeTransaction(tx: { data: string, value?: ethers.BigNumberish }) {
  const exchangeContractInterface = Exchange__factory.createInterface();
  const txDescription = exchangeContractInterface.parseTransaction(tx);
  const schema = z.union([
    fillOrdersSchema,
    swapThroughOrionPoolSchema,
    fillThroughOrionPoolSchema,
  ]);
  const data = schema.parse(txDescription);
  return data;
}
