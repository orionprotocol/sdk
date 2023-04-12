import { ERC20__factory, type Exchange } from '@orionprotocol/contracts';

import type { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { INTERNAL_ORION_PRECISION, NATIVE_CURRENCY_PRECISION } from '../constants/index.js';
import type { OrionAggregator } from '../services/OrionAggregator/index.js';
import denormalizeNumber from './denormalizeNumber.js';

export default async function getBalance(
  orionAggregator: OrionAggregator,
  assetName: string,
  assetAddress: string,
  walletAddress: string,
  exchangeContract: Exchange,
  provider: ethers.providers.Provider,
) {
  const assetIsNativeCryptocurrency = assetAddress === ethers.constants.AddressZero;

  let assetWalletBalance: ethers.BigNumber | undefined;

  let denormalizedAssetInWalletBalance: BigNumber | undefined;

  if (!assetIsNativeCryptocurrency) {
    const assetContract = ERC20__factory.connect(assetAddress, provider);
    const assetDecimals = await assetContract.decimals();
    assetWalletBalance = await assetContract.balanceOf(walletAddress);

    denormalizedAssetInWalletBalance = denormalizeNumber(assetWalletBalance, assetDecimals);
  } else {
    assetWalletBalance = await provider.getBalance(walletAddress);
    denormalizedAssetInWalletBalance = denormalizeNumber(assetWalletBalance, NATIVE_CURRENCY_PRECISION);
  }
  const assetContractBalance = await exchangeContract.getBalance(assetAddress, walletAddress);
  const denormalizedAssetInContractBalance = denormalizeNumber(assetContractBalance, INTERNAL_ORION_PRECISION);
  const denormalizedAssetLockedBalanceResult = await orionAggregator.getLockedBalance(walletAddress, assetName);
  if (denormalizedAssetLockedBalanceResult.isErr()) {
    throw new Error(denormalizedAssetLockedBalanceResult.error.message);
  }

  return {
    exchange: denormalizedAssetInContractBalance.minus(denormalizedAssetLockedBalanceResult.value[assetName] ?? 0),
    wallet: denormalizedAssetInWalletBalance,
  };
}
