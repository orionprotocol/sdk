import { ethers } from 'ethers';
import type { Source } from '../types.js';

export default function getAvailableFundsSources(
  expenseType: 'amount' | 'network_fee' | 'service_fee',
  assetAddress: string,
  route: 'aggregator' | 'pool',
): Source[] {
  switch (route) {
    case 'aggregator':
      if (assetAddress === ethers.constants.AddressZero) return ['exchange']; // We can't take native crypto from wallet
      return ['exchange', 'wallet']; // We can take any token amount from exchange + wallet. Order is important!
    case 'pool':
      if (expenseType === 'network_fee') return ['wallet']; // Network fee is always taken from wallet
      return ['exchange', 'wallet']; // We can take any token amount from exchange + wallet (specify 'value' for 'pool'). Order is important!
    default:
      throw new Error('Unknown route item');
  }
}
