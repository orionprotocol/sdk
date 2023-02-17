import type { Exchange } from '@orionprotocol/contracts';
import type BigNumber from 'bignumber.js';
import type { ethers } from 'ethers';
import type { OrionAggregator } from '../services/OrionAggregator';
import getBalance from './getBalance';

export default async (
  balancesRequired: Partial<Record<string, string>>,
  orionAggregator: OrionAggregator,
  walletAddress: string,
  exchangeContract: Exchange,
  provider: ethers.providers.Provider,
) => {
  const balances = await Promise.all(
    Object.entries(balancesRequired)
      .map(async ([asset, assetAddress]) => {
        if (assetAddress === undefined) throw new Error(`Asset address of ${asset} not found`);
        const balance = await getBalance(
          orionAggregator,
          asset,
          assetAddress,
          walletAddress,
          exchangeContract,
          provider,
        );
        return {
          asset,
          amount: balance,
        };
      }),
  );

  return balances.reduce<Partial<Record<string, {
    exchange: BigNumber
    wallet: BigNumber
  }>>>((prev, curr) => ({
    ...prev,
    [curr.asset]: curr.amount,
  }), {});
};
