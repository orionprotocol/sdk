import type { Exchange } from '@orionprotocol/contracts/lib/ethers-v6/index.js';
import type { BigNumber } from 'bignumber.js';
import type { ethers } from 'ethers';
import type { Aggregator } from '../services/Aggregator/index.js';
import getBalance from './getBalance.js';

export default async (
  balancesRequired: Partial<Record<string, string>>,
  aggregator: Aggregator,
  walletAddress: string,
  exchangeContract: Exchange,
  provider: ethers.Provider,
) => {
  const balances = await Promise.all(
    Object.entries(balancesRequired)
      .map(async ([assetName, assetAddress]) => {
        if (assetAddress === undefined) throw new Error(`Asset address of ${assetName} not found`);
        const balance = await getBalance(
          aggregator,
          assetName,
          assetAddress,
          walletAddress,
          exchangeContract,
          provider,
        );
        return {
          assetName,
          amount: balance,
        };
      }),
  );

  return balances.reduce<Partial<Record<string, {
    exchange: BigNumber
    wallet: BigNumber
  }>>>((prev, curr) => ({
    ...prev,
    [curr.assetName]: curr.amount,
  }), {});
};
