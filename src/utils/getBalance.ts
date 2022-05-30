import { ERC20__factory, Exchange } from '@orionprotocol/contracts';

import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { utils } from '..';
import { INTERNAL_ORION_PRECISION, NATIVE_CURRENCY_PRECISION } from '../constants';
import { OrionAggregator } from '../services/OrionAggregator';

export default async function getBalance(
  orionAggregator: OrionAggregator,
  asset: string,
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

    denormalizedAssetInWalletBalance = utils.denormalizeNumber(assetWalletBalance, assetDecimals);
  } else {
    assetWalletBalance = await provider.getBalance(walletAddress);
    denormalizedAssetInWalletBalance = utils.denormalizeNumber(assetWalletBalance, NATIVE_CURRENCY_PRECISION);
  }
  const assetContractBalance = await exchangeContract.getBalance(assetAddress, walletAddress);
  const denormalizedAssetInContractBalance = utils.denormalizeNumber(assetContractBalance, INTERNAL_ORION_PRECISION);
  const denormalizedAssetLockedBalanceResult = await orionAggregator.getLockedBalance(walletAddress, asset);
  if (denormalizedAssetLockedBalanceResult.isErr()) {
    throw new Error(denormalizedAssetLockedBalanceResult.error.message);
  }

  return {
    exchange: denormalizedAssetInContractBalance.minus(denormalizedAssetLockedBalanceResult.value[asset] ?? 0),
    wallet: denormalizedAssetInWalletBalance,
  };
}
