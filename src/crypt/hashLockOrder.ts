import { ethers } from 'ethers';
import type { LockOrder } from '../types.js';

export const hashLockOrder = (order: LockOrder) => ethers.solidityPackedKeccak256(
  [
    'uint8',
    'address',
    'uint64',
    'string',
    'uint64',
    'uint64',
    'uint64',
    'string'
  ],
  [
    '0x03',
    order.user,
    order.sender,
    order.expiration,
    order.asset,
    order.amount,
    order.targetChainId,
    order.secretHash
  ],
);
