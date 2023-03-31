import { ethers } from 'ethers';
import type { Order } from '../types.js';

const hashOrder = (order: Order) => ethers.utils.solidityKeccak256(
  [
    'uint8',
    'address',
    'address',
    'address',
    'address',
    'address',
    'uint64',
    'uint64',
    'uint64',
    'uint64',
    'uint64',
    'uint8',
  ],
  [
    '0x03',
    order.senderAddress,
    order.matcherAddress,
    order.baseAsset,
    order.quoteAsset,
    order.matcherFeeAsset,
    order.amount,
    order.price,
    order.matcherFee,
    order.nonce,
    order.expiration,
    order.buySide === 1 ? '0x01' : '0x00',
  ],
);

export default hashOrder;
