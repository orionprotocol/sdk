import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { contracts } from '..';
import { OrionAggregator } from '../services/OrionAggregator';
import getBalance from './getBalance';

export default async (
  balancesRequired: Partial<Record<string, string>>,
  orionAggregator: OrionAggregator,
  walletAddress: string,
  exchangeContract: contracts.Exchange,
  provider: ethers.providers.Provider,
) => {
  const balances = await Promise.all(
    Object.entries(balancesRequired)
      .map(async ([asset, assetAddress]) => {
        if (!assetAddress) throw new Error(`Asset address of ${asset} not found`);
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
      exchange: BigNumber,
      wallet: BigNumber,
      allowance: BigNumber,
  }>>>((prev, curr) => ({
    ...prev,
    [curr.asset]: curr.amount,
  }), {});
};
