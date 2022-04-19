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
  let assetAllowance: ethers.BigNumber | undefined;

  let denormalizedAssetInWalletBalance: BigNumber | undefined;
  let denormalizedAssetInAllowance: BigNumber | undefined;

  if (!assetIsNativeCryptocurrency) {
    const assetContract = contracts.ERC20__factory.connect(assetAddress, provider);
    const assetDecimals = await assetContract.decimals();
    assetWalletBalance = await assetContract.balanceOf(walletAddress);
    assetAllowance = await assetContract.allowance(walletAddress, exchangeContract.address);

    denormalizedAssetInWalletBalance = utils.denormalizeNumber(assetWalletBalance, assetDecimals);
    denormalizedAssetInAllowance = utils.denormalizeNumber(assetAllowance, assetDecimals);
  } else {
    assetWalletBalance = await provider.getBalance(walletAddress);
    denormalizedAssetInWalletBalance = utils.denormalizeNumber(assetWalletBalance, NATIVE_CURRENCY_PRECISION);
    denormalizedAssetInAllowance = denormalizedAssetInWalletBalance; // For native crypto no allowance is needed
  }
  const assetContractBalance = await exchangeContract.getBalance(assetAddress, walletAddress);
  const denormalizedAssetInContractBalance = utils.denormalizeNumber(assetContractBalance, INTERNAL_ORION_PRECISION);
  //   const denormalizedAssetWalletBalanceAvailable = BigNumber.min(denormalizedAssetInAllowance, denormalizedAssetInWalletBalance);
  const denormalizedAssetLockedBalance = await orionAggregator.getLockedBalance(walletAddress, asset);

  //   const denormalizedAssetAvailableBalance = denormalizedAssetInContractBalance
  //     .plus(denormalizedAssetWalletBalanceAvailable)
  //     .minus(denormalizedAssetLockedBalance[asset] ?? 0);
  //   const denormalizedAssetImaginaryBalance = denormalizedAssetInContractBalance
  //     .plus(denormalizedAssetInWalletBalance)
  //     .minus(denormalizedAssetLockedBalance[asset] ?? 0);

  return {
    exchange: denormalizedAssetInContractBalance.minus(denormalizedAssetLockedBalance[asset] ?? 0),
    // imaginary: denormalizedAssetImaginaryBalance,
    wallet: denormalizedAssetInWalletBalance,
    allowance: denormalizedAssetInAllowance,
    // approvedWalletBalance: denormalizedAssetWalletBalanceAvailable,
    // available: denormalizedAssetAvailableBalance,
    // locked: denormalizedAssetLockedBalance[asset],
  };
}
