import { ERC20__factory, type Exchange } from '@orionprotocol/contracts/lib/ethers-v6/index.js';
import type { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { INTERNAL_PROTOCOL_PRECISION, NATIVE_CURRENCY_PRECISION } from '../constants/index.js';
import type { Aggregator } from '../services/Aggregator/index.js';
import denormalizeNumber from './denormalizeNumber.js';

export default async function getBalance(
  aggregator: Aggregator,
  assetName: string,
  assetAddress: string,
  walletAddress: string,
  exchangeContract: Exchange,
  provider: ethers.Provider,
) {
  const assetIsNativeCryptocurrency = assetAddress === ethers.ZeroAddress;

  let assetWalletBalance: bigint | undefined;

  let denormalizedAssetInWalletBalance: BigNumber | undefined;

  if (!assetIsNativeCryptocurrency) {
    const assetContract = ERC20__factory.connect(assetAddress, provider);
    const assetDecimals = await assetContract.decimals();
    assetWalletBalance = await assetContract.balanceOf(walletAddress);

    denormalizedAssetInWalletBalance = denormalizeNumber(assetWalletBalance, assetDecimals);
  } else {
    assetWalletBalance = await provider.getBalance(walletAddress);
    denormalizedAssetInWalletBalance = denormalizeNumber(assetWalletBalance, BigInt(NATIVE_CURRENCY_PRECISION));
  }
  const assetContractBalance = await exchangeContract.getBalance(assetAddress, walletAddress);
  const denormalizedAssetInContractBalance = denormalizeNumber(assetContractBalance, BigInt(INTERNAL_PROTOCOL_PRECISION));
  const denormalizedAssetLockedBalanceResult = await aggregator.getLockedBalance(walletAddress, assetName);
  if (denormalizedAssetLockedBalanceResult.isErr()) {
    throw new Error(denormalizedAssetLockedBalanceResult.error.message);
  }

  return {
    exchange: denormalizedAssetInContractBalance.minus(denormalizedAssetLockedBalanceResult.value.data[assetName] ?? 0),
    wallet: denormalizedAssetInWalletBalance,
  };
}
