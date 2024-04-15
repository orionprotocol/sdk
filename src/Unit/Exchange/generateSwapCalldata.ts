import type { LibValidator } from '@orionprotocol/contracts/lib/ethers-v6/Exchange.js';
import { ethers, ZeroAddress } from 'ethers';
import type { AddressLike, JsonRpcProvider, BigNumberish, BytesLike } from 'ethers';
import cloneDeep from 'lodash.clonedeep';
import { safeGet, SafeArray } from '../../utils/safeGetters.js';
import { simpleFetch } from 'simple-typed-fetch';
import type Unit from '../index.js';
import { generateUni2Calls, generateUni2Call } from './callGenerators/uniswapV2.js';
import {
  generateUni3Calls,
  generateOrion3Calls,
  generateUni3Call,
  generateOrion3Call,
} from './callGenerators/uniswapV3.js';
import { exchangeToNativeDecimals, generateCalls, pathCallWithBalance } from './callGenerators/utils.js';
import { generateTransferCall } from './callGenerators/erc20.js';
import { generateCurveStableSwapCall } from './callGenerators/curve.js';
import type { SingleSwap } from '../../types.js';
import { addressLikeToString } from '../../utils/addressLikeToString.js';
import { generateUnwrapAndTransferCall, generateWrapAndTransferCall } from './callGenerators/weth.js';
import { getExchangeAllowance, getTotalBalance } from '../../utils/getBalance.js';
import { generateFeePaymentCall } from './callGenerators/feePayment.js';

export type Factory = 'UniswapV2' | 'UniswapV3' | 'Curve' | 'OrionV2' | 'OrionV3';

type BaseGenerateSwapCalldataParams = {
  amount: BigNumberish
  minReturnAmount: BigNumberish
  initiatorAddress: string
  receiverAddress: string
  path: ArrayLike<SingleSwap>
  matcher?: AddressLike
  feeToken?: AddressLike
  fee?: BigNumberish
}

export type GenerateSwapCalldataWithUnitParams = BaseGenerateSwapCalldataParams & {
  unit: Unit
  logger?: ((message: string) => void) | undefined
};

export type GenerateSwapCalldataParams = BaseGenerateSwapCalldataParams & {
  exchangeContractAddress: AddressLike
  wethAddress: AddressLike
  curveRegistryAddress: AddressLike
  swapExecutorContractAddress: AddressLike
  provider: JsonRpcProvider
  logger?: ((message: string) => void) | undefined
};

export async function generateSwapCalldataWithUnit({
  amount,
  minReturnAmount,
  initiatorAddress,
  receiverAddress,
  path: arrayLikePath,
  matcher = ZeroAddress,
  feeToken = ZeroAddress,
  fee = 0,
  unit,
}: GenerateSwapCalldataWithUnitParams): Promise<{
  calldata: string
  swapDescription: LibValidator.SwapDescriptionStruct
  value: bigint
}> {
  if (arrayLikePath == undefined || arrayLikePath.length == 0) {
    throw new Error('Empty path');
  }
  const wethAddress = safeGet(unit.contracts, 'WETH');
  const curveRegistryAddress = safeGet(unit.contracts, 'curveRegistry');
  const { swapExecutorContractAddress, exchangeContractAddress } = await simpleFetch(
    unit.blockchainService.getInfo
  )();

  const arrayLikePathCopy = cloneDeep(arrayLikePath);
  let path = SafeArray.from(arrayLikePathCopy);

  path = SafeArray.from(arrayLikePathCopy).map((swapInfo) => ({
    ...swapInfo,
    assetIn: swapInfo.assetAddressIn.toLowerCase(),
    assetOut: swapInfo.assetAddressOut.toLowerCase(),
  }));

  return await generateSwapCalldata({
    amount,
    minReturnAmount,
    receiverAddress,
    initiatorAddress,
    path,
    matcher,
    feeToken,
    fee,
    exchangeContractAddress,
    wethAddress,
    curveRegistryAddress,
    swapExecutorContractAddress,
    provider: unit.provider,
  });
}

export async function generateSwapCalldata({
  amount,
  minReturnAmount,
  initiatorAddress,
  receiverAddress,
  path: arrayLikePath,
  matcher: matcherAddressLike = ZeroAddress,
  feeToken: feeTokenAddressLike = ZeroAddress,
  fee = 0,
  exchangeContractAddress,
  wethAddress: wethAddressLike,
  curveRegistryAddress: curveRegistryAddressLike,
  swapExecutorContractAddress: swapExecutorContractAddressLike,
  provider,
  logger,
}: GenerateSwapCalldataParams): Promise<{
  calldata: string
  swapDescription: LibValidator.SwapDescriptionStruct
  value: bigint
}> {
  const wethAddress = await addressLikeToString(wethAddressLike);
  console.log('wethAddress', wethAddress);
  const curveRegistryAddress = await addressLikeToString(curveRegistryAddressLike);
  logger?.(`curveRegistryAddress: ${curveRegistryAddress}`);
  const swapExecutorContractAddress = await addressLikeToString(swapExecutorContractAddressLike);
  logger?.(`swapExecutorContractAddress, ${swapExecutorContractAddress}`);
  const feeToken = await addressLikeToString(feeTokenAddressLike);
  logger?.(`feeToken, ${feeToken}`);
  const matcher = await addressLikeToString(matcherAddressLike);
  logger?.(`matcher: ${matcher}`);
  logger?.(`arrayLikePath: ${arrayLikePath}`);
  let path = SafeArray.from(arrayLikePath).map((swapInfo) => {
    console.log('swapInfo', swapInfo);
    swapInfo.assetIn = swapInfo.assetIn.toLowerCase()
    swapInfo.assetOut = swapInfo.assetOut.toLowerCase()
    return swapInfo;
  });
  console.log('path', path);

  const { assetIn: srcToken } = path.first();
  const { assetOut: dstToken } = path.last();

  let swapDescription: LibValidator.SwapDescriptionStruct = {
    srcToken,
    dstToken,
    srcReceiver: swapExecutorContractAddress,
    dstReceiver: receiverAddress,
    amount,
    minReturnAmount,
    flags: 0,
  };
  console.log('swapDescription', swapDescription);
  const amountNativeDecimals = await exchangeToNativeDecimals(srcToken, amount, provider);
  console.log('amountNativeDecimals', amountNativeDecimals);
  const feeNativeDecimals = await exchangeToNativeDecimals(feeToken, fee, provider)
  console.log('feeNativeDecimals', feeNativeDecimals);

  path = SafeArray.from(arrayLikePath).map((singleSwap) => {
    if (singleSwap.assetIn == ethers.ZeroAddress) singleSwap.assetIn = wethAddress;
    if (singleSwap.assetOut == ethers.ZeroAddress) singleSwap.assetOut = wethAddress;
    return singleSwap;
  });
  console.log('path2', path);

  let calls: BytesLike[];
  ({ swapDescription, calls } = await processSwaps(
    swapDescription,
    path,
    amountNativeDecimals,
    matcher,
    feeToken,
    feeNativeDecimals,
    wethAddress,
    swapExecutorContractAddress,
    curveRegistryAddress,
    provider
  ));
  console.log('swapDescription', swapDescription);
  console.log('calls', calls);
  const calldata = generateCalls(calls);
  console.log('calldata', calldata);

  const { useExchangeBalance, additionalTransferAmount } = await shouldUseExchangeBalance(
    srcToken,
    initiatorAddress,
    exchangeContractAddress,
    amountNativeDecimals,
    provider
  );
  console.log('useExchangeBalance', useExchangeBalance);
  console.log('additionalTransferAmount', additionalTransferAmount);
  if (useExchangeBalance) {
    swapDescription.flags = 1n << 255n;
  }
  const value = srcToken == ZeroAddress ? additionalTransferAmount : 0n;
  console.log('value', value);
  return { swapDescription, calldata, value };
}

async function processSwaps(
  swapDescription: LibValidator.SwapDescriptionStruct,
  path: SafeArray<SingleSwap>,
  amount: BigNumberish,
  matcher: string,
  feeToken: string,
  fee: BigNumberish,
  wethAddress: string,
  swapExecutorContractAddress: string,
  curveRegistryAddress: string,
  provider: JsonRpcProvider
) {
  const { factory: firstSwapFactory } = path.first();
  const isSingleFactorySwap = path.every((singleSwap) => singleSwap.factory === firstSwapFactory);
  let calls: BytesLike[];
  if (isSingleFactorySwap) {
    ({ swapDescription, calls } = await processSingleFactorySwaps(
      firstSwapFactory,
      swapDescription,
      path,
      amount,
      swapExecutorContractAddress,
      curveRegistryAddress,
      provider
    ));
  } else {
    ({ swapDescription, calls } = await processMultiFactorySwaps(
      swapDescription,
      path,
      amount,
      swapExecutorContractAddress,
      curveRegistryAddress,
      provider
    ));
  }

  ({ swapDescription, calls } = await payFeeToMatcher(matcher, feeToken, fee, calls, swapDescription));

  ({ swapDescription, calls } = wrapOrUnwrapIfNeeded(
    amount,
    swapDescription,
    calls,
    swapExecutorContractAddress,
    wethAddress
  ));

  return { swapDescription, calls };
}

async function processSingleFactorySwaps(
  factory: Factory,
  swapDescription: LibValidator.SwapDescriptionStruct,
  path: SafeArray<SingleSwap>,
  amount: BigNumberish,
  swapExecutorContractAddress: string,
  curveRegistryAddress: string,
  provider: JsonRpcProvider
) {
  let calls: BytesLike[] = [];
  switch (factory) {
    case 'OrionV2': {
      swapDescription.srcReceiver = path.first().pool;
      calls = await generateUni2Calls(path, swapExecutorContractAddress);
      break;
    }
    case 'UniswapV2': {
      swapDescription.srcReceiver = path.first().pool;
      calls = await generateUni2Calls(path, swapExecutorContractAddress);
      break;
    }
    case 'UniswapV3': {
      calls = await generateUni3Calls(path, amount, swapExecutorContractAddress, provider);
      break;
    }
    case 'OrionV3': {
      calls = await generateOrion3Calls(path, amount, swapExecutorContractAddress, provider);
      break;
    }
    case 'Curve': {
      if (path.length > 1) {
        throw new Error('Supporting only single stable swap on curve');
      }
      calls = await generateCurveStableSwapCall(
        amount,
        swapExecutorContractAddress,
        path.first(),
        provider,
        swapExecutorContractAddress,
        curveRegistryAddress
      );
      break;
    }
    default: {
      throw new Error(`Factory ${factory} is not supported`);
    }
  }
  return { swapDescription, calls };
}

async function processMultiFactorySwaps(
  swapDescription: LibValidator.SwapDescriptionStruct,
  path: SafeArray<SingleSwap>,
  amount: BigNumberish,
  swapExecutorContractAddress: string,
  curveRegistryAddress: string,
  provider: JsonRpcProvider
) {
  const calls: BytesLike[] = [];
  for (const swap of path) {
    switch (swap.factory) {
      case 'OrionV2': {
        let transferCall = generateTransferCall(swap.assetIn, swap.pool, 0);
        transferCall = pathCallWithBalance(transferCall, swap.assetIn);
        const uni2Call = generateUni2Call(swap.pool, swap.assetIn, swap.assetOut, swapExecutorContractAddress);
        calls.push(transferCall, uni2Call);
        break;
      }
      case 'UniswapV2': {
        let transferCall = generateTransferCall(swap.assetIn, swap.pool, 0);
        transferCall = pathCallWithBalance(transferCall, swap.assetIn);
        const uni2Call = generateUni2Call(swap.pool, swap.assetIn, swap.assetOut, swapExecutorContractAddress);
        calls.push(transferCall, uni2Call);
        break;
      }
      case 'UniswapV3': {
        let uni3Call = await generateUni3Call(swap, 0, swapExecutorContractAddress, provider);
        uni3Call = pathCallWithBalance(uni3Call, swap.assetIn);
        calls.push(uni3Call);
        break;
      }
      case 'OrionV3': {
        let orion3Call = await generateOrion3Call(swap, 0, swapExecutorContractAddress, provider);
        orion3Call = pathCallWithBalance(orion3Call, swap.assetIn);
        calls.push(orion3Call);
        break;
      }
      case 'Curve': {
        const curveCalls = await generateCurveStableSwapCall(
          amount,
          swapExecutorContractAddress,
          swap,
          provider,
          swapExecutorContractAddress,
          curveRegistryAddress,
          true
        );
        calls.push(...curveCalls);
        break;
      }
      default: {
        throw new Error(`Factory ${swap.factory} is not supported`);
      }
    }
  }
  return { swapDescription, calls };
}

async function payFeeToMatcher(
  matcher: string,
  feeToken: string,
  feeAmount: BigNumberish,
  calls: BytesLike[],
  swapDescription: LibValidator.SwapDescriptionStruct,
) {
  if (BigInt(feeAmount) !== 0n && feeToken === swapDescription.dstToken) {
    const feePaymentCall = generateFeePaymentCall(matcher, feeToken, feeAmount)
    calls.push(feePaymentCall)
  }
  return { swapDescription, calls }
}

function wrapOrUnwrapIfNeeded(
  amount: BigNumberish,
  swapDescription: LibValidator.SwapDescriptionStruct,
  calls: BytesLike[],
  swapExecutorContractAddress: string,
  wethAddress: string
) {
  const { dstReceiver, srcReceiver, srcToken, dstToken } = swapDescription;
  if (srcToken === ZeroAddress) {
    const wrapCall = generateWrapAndTransferCall(srcReceiver, { value: amount });
    swapDescription.srcReceiver = swapExecutorContractAddress;
    calls = ([wrapCall] as BytesLike[]).concat(calls);
  }
  if (dstToken === ZeroAddress) {
    let unwrapCall = generateUnwrapAndTransferCall(dstReceiver, 0);
    unwrapCall = pathCallWithBalance(unwrapCall, wethAddress);
    calls.push(unwrapCall);
  } else {
    let transferCall = generateTransferCall(dstToken, dstReceiver, 0);
    transferCall = pathCallWithBalance(transferCall, dstToken);
    calls.push(transferCall);
  }
  return { swapDescription, calls };
}

async function shouldUseExchangeBalance(
  srcToken: AddressLike,
  initiatorAddress: AddressLike,
  exchangeContractAddress: AddressLike,
  amount: bigint,
  provider: JsonRpcProvider
) {
  const { walletBalance, exchangeBalance } = await getTotalBalance(
    srcToken,
    initiatorAddress,
    exchangeContractAddress,
    provider
  );

  const exchangeAllowance = await getExchangeAllowance(srcToken, initiatorAddress, exchangeContractAddress, provider);

  if (walletBalance + exchangeBalance < amount) {
    throw new Error(
      `Not enough balance to make swap, walletBalance: ${walletBalance} exchangeBalance: ${exchangeBalance} totalBalance - ${walletBalance + exchangeBalance} swapAmount - ${amount}`
    );
  }
  let useExchangeBalance = true;
  let additionalTransferAmount = 0n;

  if (walletBalance >= amount || exchangeBalance == 0n) {
    useExchangeBalance = false;
    additionalTransferAmount = amount;
  } else {
    additionalTransferAmount = exchangeBalance >= amount ? 0n : amount - exchangeBalance;
    if (srcToken !== ZeroAddress && additionalTransferAmount > exchangeAllowance) {
      throw new Error(
        `Not enough allowance to make swap, allowance - ${exchangeAllowance} needed allowance - ${additionalTransferAmount}`
      );
    }
  }
  return { useExchangeBalance, additionalTransferAmount };
}
