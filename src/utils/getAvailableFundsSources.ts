import { ethers } from 'ethers';
import type { Source } from '../types';

export default function getAvailableFundsSources(
  expenseType: 'amount' | 'network_fee' | 'orion_fee',
  assetAddress: string,
  route: 'aggregator' | 'orion_pool',
): Source[] {
  switch (route) {
    case 'aggregator':
      if (assetAddress === ethers.constants.AddressZero) return ['exchange']; // We can't take native crypto from wallet
      return ['exchange', 'wallet']; // We can take any token amount from exchange + wallet. Order is important!
    case 'orion_pool':
      if (expenseType === 'network_fee') return ['wallet']; // Network fee is always taken from wallet
      return ['exchange', 'wallet']; // We can take any token amount from exchange + wallet (specify 'value' for 'orion_pool'). Order is important!
    default:
      throw new Error('Unknown route item');
  }
}
