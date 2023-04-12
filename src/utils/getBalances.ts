import type { Exchange } from '@orionprotocol/contracts';
import type { BigNumber } from 'bignumber.js';
import type { ethers } from 'ethers';
import type { OrionAggregator } from '../services/OrionAggregator/index.js';
import getBalance from './getBalance.js';

export default async (
  balancesRequired: Partial<Record<string, string>>,
  orionAggregator: OrionAggregator,
  walletAddress: string,
  exchangeContract: Exchange,
  provider: ethers.providers.Provider,
) => {
  const balances = await Promise.all(
    Object.entries(balancesRequired)
      .map(async ([assetName, assetAddress]) => {
        if (assetAddress === undefined) throw new Error(`Asset address of ${assetName} not found`);
        const balance = await getBalance(
          orionAggregator,
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
