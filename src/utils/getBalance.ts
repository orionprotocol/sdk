import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { contracts, utils } from '..';
import { INTERNAL_ORION_PRECISION, NATIVE_CURRENCY_PRECISION } from '../constants';
import { OrionAggregator } from '../services/OrionAggregator';

export default async function getBalance(
  orionAggregator: OrionAggregator,
  asset: string,
  assetAddress: string,
  walletAddress: string,
  exchangeContract: contracts.Exchange,
  provider: ethers.providers.Provider,
) {
  const assetIsNativeCryptocurrency = assetAddress === ethers.constants.AddressZero;

  let assetWalletBalance: ethers.BigNumber | undefined;

  let denormalizedAssetInWalletBalance: BigNumber | undefined;

  if (!assetIsNativeCryptocurrency) {
    const assetContract = contracts.ERC20__factory.connect(assetAddress, provider);
    const assetDecimals = await assetContract.decimals();
    assetWalletBalance = await assetContract.balanceOf(walletAddress);

    denormalizedAssetInWalletBalance = utils.denormalizeNumber(assetWalletBalance, assetDecimals);
  } else {
    assetWalletBalance = await provider.getBalance(walletAddress);
    denormalizedAssetInWalletBalance = utils.denormalizeNumber(assetWalletBalance, NATIVE_CURRENCY_PRECISION);
  }
  const assetContractBalance = await exchangeContract.getBalance(assetAddress, walletAddress);
  const denormalizedAssetInContractBalance = utils.denormalizeNumber(assetContractBalance, INTERNAL_ORION_PRECISION);
  const denormalizedAssetLockedBalance = await orionAggregator.getLockedBalance(walletAddress, asset);

  return {
    exchange: denormalizedAssetInContractBalance.minus(denormalizedAssetLockedBalance[asset] ?? 0),
    wallet: denormalizedAssetInWalletBalance,
  };
}
