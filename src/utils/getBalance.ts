import { ERC20__factory, Exchange__factory, type Exchange } from "@orionprotocol/contracts/lib/ethers-v6/index.js";
import type { BigNumber } from "bignumber.js";
import { ZeroAddress, ethers } from "ethers";
import { INTERNAL_PROTOCOL_PRECISION, NATIVE_CURRENCY_PRECISION } from "../constants/index.js";
import type { Aggregator } from "../services/Aggregator/index.js";
import denormalizeNumber from "./denormalizeNumber.js";
import type { AddressLike } from "ethers";
import { addressLikeToString } from "./addressLikeToString.js";

export default async function getBalance(
  aggregator: Aggregator,
  assetName: string,
  assetAddress: string,
  walletAddress: string,
  exchangeContract: Exchange,
  provider: ethers.Provider
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
  const denormalizedAssetInContractBalance = denormalizeNumber(
    assetContractBalance,
    BigInt(INTERNAL_PROTOCOL_PRECISION)
  );
  const denormalizedAssetLockedBalanceResult = await aggregator.getLockedBalance(walletAddress, assetName);
  if (denormalizedAssetLockedBalanceResult.isErr()) {
    throw new Error(denormalizedAssetLockedBalanceResult.error.message);
  }

  return {
    exchange: denormalizedAssetInContractBalance.minus(denormalizedAssetLockedBalanceResult.value.data[assetName] ?? 0),
    wallet: denormalizedAssetInWalletBalance,
  };
}

async function getExchangeBalanceERC20(
  tokenAddress: AddressLike,
  walletAddress: AddressLike,
  exchangeAddress: AddressLike,
  provider: ethers.Provider,
  convertToNativeDecimals = true
) {
  walletAddress = await addressLikeToString(walletAddress);
  exchangeAddress = await addressLikeToString(exchangeAddress);
  tokenAddress = await addressLikeToString(tokenAddress);

  const exchange = <Exchange>Exchange__factory.connect(exchangeAddress, provider);
  const exchangeBalance = await exchange.getBalance(tokenAddress, walletAddress);

  if (convertToNativeDecimals) {
    const tokenContract = ERC20__factory.connect(tokenAddress, provider);
    const decimals = await tokenContract.decimals();
    const convertedExchangeBalance = (exchangeBalance * BigInt(10) ** decimals) / BigInt(10) ** 8n;
    return convertedExchangeBalance;
  }

  return exchangeBalance;
}

async function getExchangeBalanceNative(
  walletAddress: AddressLike,
  exchangeAddress: AddressLike,
  provider: ethers.Provider,
  convertToNativeDecimals = true
) {
  walletAddress = await addressLikeToString(walletAddress);
  exchangeAddress = await addressLikeToString(exchangeAddress);
  const exchange = <Exchange>Exchange__factory.connect(exchangeAddress, provider);
  const exchangeBalance = await exchange.getBalance(ZeroAddress, walletAddress);

  if (convertToNativeDecimals) {
    const convertedExchangeBalance = (exchangeBalance * BigInt(10) ** 18n) / BigInt(10) ** 8n;
    return convertedExchangeBalance;
  }

  return exchangeBalance;
}

export async function getExchangeBalance(
  tokenAddress: AddressLike,
  walletAddress: AddressLike,
  exchangeAddress: AddressLike,
  provider: ethers.Provider,
  convertToNativeDecimals = true
) {
  walletAddress = await addressLikeToString(walletAddress);
  tokenAddress = await addressLikeToString(tokenAddress);

  if (typeof tokenAddress === "string" && tokenAddress === ZeroAddress) {
    return getExchangeBalanceNative(walletAddress, exchangeAddress, provider, convertToNativeDecimals);
  } else {
    return getExchangeBalanceERC20(tokenAddress, walletAddress, exchangeAddress, provider, convertToNativeDecimals);
  }
}

export async function getExchangeAllowance(
  tokenAddress: AddressLike,
  walletAddress: AddressLike,
  exchangeAddress: AddressLike,
  provider: ethers.Provider
) {
  if (typeof tokenAddress === "string" && tokenAddress === ZeroAddress) {
    return 0n;
  } else {
    walletAddress = await addressLikeToString(walletAddress);
    tokenAddress = await addressLikeToString(tokenAddress);

    const tokenContract = ERC20__factory.connect(tokenAddress, provider);
    let allowance = await tokenContract.allowance(walletAddress, exchangeAddress);

    return allowance;
  }
}

async function getWalletBalanceERC20(
  tokenAddress: AddressLike,
  walletAddress: AddressLike,
  provider: ethers.Provider,
  convertToExchangeDecimals = false
) {
  walletAddress = await addressLikeToString(walletAddress);
  tokenAddress = await addressLikeToString(tokenAddress);

  const tokenContract = ERC20__factory.connect(tokenAddress, provider);
  let walletBalance = await tokenContract.balanceOf(walletAddress);

  if (convertToExchangeDecimals) {
    const tokenContract = ERC20__factory.connect(tokenAddress, provider);
    const decimals = await tokenContract.decimals();
    const convertedNativeBalance = (walletBalance * BigInt(10) ** 8n) / BigInt(10) ** decimals;
    return convertedNativeBalance;
  }
  return walletBalance;
}

async function getWalletBalanceNative(
  walletAddress: AddressLike,
  provider: ethers.Provider,
  convertToExchangeDecimals = false
) {
  walletAddress = await addressLikeToString(walletAddress);
  const nativeBalance = await provider.getBalance(walletAddress);

  if (convertToExchangeDecimals) {
    const convertedNativeBalance = (nativeBalance * BigInt(10) ** 8n) / BigInt(10) ** 18n;
    return convertedNativeBalance;
  }

  return nativeBalance;
}

export async function getWalletBalance(
  tokenAddress: AddressLike,
  walletAddress: AddressLike,
  provider: ethers.Provider,
  convertToExchangeDecimals = false
) {
  if (typeof tokenAddress === "string" && tokenAddress === ZeroAddress) {
    return getWalletBalanceNative(walletAddress, provider, convertToExchangeDecimals);
  } else {
    return getWalletBalanceERC20(tokenAddress, walletAddress, provider, convertToExchangeDecimals);
  }
}

export async function getTotalBalance(
  tokenAddress: AddressLike,
  walletAddress: AddressLike,
  exchangeAddress: AddressLike,
  provider: ethers.Provider,
  convertToNativeDecimals = true
) {
  const walletBalance = await getWalletBalance(tokenAddress, walletAddress, provider, !convertToNativeDecimals);
  const exchangeBalance = await getExchangeBalance(
    tokenAddress,
    walletAddress,
    exchangeAddress,
    provider,
    convertToNativeDecimals
  );
  return {
    walletBalance,
    exchangeBalance,
    totalBalance: walletBalance + exchangeBalance
  } 
}
