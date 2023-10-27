import type { LibValidator } from '@orionprotocol/contracts/lib/ethers-v6/Exchange.js';
import {
  ERC20__factory
} from '@orionprotocol/contracts/lib/ethers-v6/index.js';
import { ethers, type BigNumberish, type BytesLike, JsonRpcProvider } from 'ethers';
import { safeGet, SafeArray } from '../../utils/safeGetters.js';
import { simpleFetch } from 'simple-typed-fetch';
import type Unit from '../index.js';
import { generateUni2Calls, generateUni2Call } from './callGenerators/uniswapV2.js';
import { generateUni3Calls, generateOrion3Calls, generateUni3Call, generateOrion3Call } from './callGenerators/uniswapV3.js';
import { exchangeToNativeDecimals, generateCalls, pathCallWithBalance } from './callGenerators/utils.js';
import { generateApproveCall, generateTransferCall } from './callGenerators/erc20.js';
import { generateCurveStableSwapCall } from './callGenerators/curve.js';
import type { SingleSwap } from '../../types.js';
import type { AddressLike } from 'ethers';
import { addressLikeToString } from '../../utils/addressLikeToString.js';

export type Factory = "UniswapV2" | "UniswapV3" | "Curve" | "OrionV2" | "OrionV3"

export type GenerateSwapCalldataWithUnitParams = {
  amount: BigNumberish
  minReturnAmount: BigNumberish
  receiverAddress: string
  path: ArrayLike<SingleSwap>
  unit: Unit
}

export type GenerateSwapCalldataParams = {
  amount: BigNumberish
  minReturnAmount: BigNumberish
  receiverAddress: string
  path: ArrayLike<SingleSwap>
  wethAddress: AddressLike,
  curveRegistryAddress: AddressLike,
  swapExecutorContractAddress: AddressLike,
  exchangeContractAddress: AddressLike,
  provider: JsonRpcProvider
}

export async function generateSwapCalldataWithUnit({
  amount,
  minReturnAmount,
  receiverAddress,
  path: arrayLikePath,
  unit
}: GenerateSwapCalldataWithUnitParams
): Promise<{ calldata: string, swapDescription: LibValidator.SwapDescriptionStruct }> {
  if (arrayLikePath == undefined || arrayLikePath.length == 0) {
    throw new Error('Empty path');
  }
  const wethAddress = safeGet(unit.contracts, 'WETH')
  const curveRegistryAddress = safeGet(unit.contracts, 'curveRegistry')
  const { assetToAddress, swapExecutorContractAddress, exchangeContractAddress } = await simpleFetch(unit.blockchainService.getInfo)();
  let path = SafeArray.from(arrayLikePath).map((swapInfo) => {
    swapInfo.assetIn = assetToAddress[swapInfo.assetIn] ?? swapInfo.assetIn.toLowerCase();
    swapInfo.assetOut = assetToAddress[swapInfo.assetOut] ?? swapInfo.assetOut.toLowerCase();
    return swapInfo;
  })

  return generateSwapCalldata({
    amount,
    minReturnAmount,
    receiverAddress,
    path,
    wethAddress,
    curveRegistryAddress,
    swapExecutorContractAddress,
    exchangeContractAddress,
    provider: unit.provider
  })
}

export async function generateSwapCalldata({
  amount,
  minReturnAmount,
  receiverAddress,
  path: arrayLikePath,
  wethAddress: wethAddressLike,
  curveRegistryAddress: curveRegistryAddressLike,
  swapExecutorContractAddress: swapExecutorContractAddressLike,
  exchangeContractAddress: exchangeContractAddressLike,
  provider,
}: GenerateSwapCalldataParams) {
  const wethAddress = await addressLikeToString(wethAddressLike)
  const curveRegistryAddress = await addressLikeToString(curveRegistryAddressLike)
  const swapExecutorContractAddress = await addressLikeToString(swapExecutorContractAddressLike)
  const exchangeContractAddress = await addressLikeToString(exchangeContractAddressLike)
  let path = SafeArray.from(arrayLikePath)

  const { factory, assetIn: srcToken } = path.first()
  const dstToken = path.last().assetOut

  let swapDescription: LibValidator.SwapDescriptionStruct = {
    srcToken: srcToken,
    dstToken: dstToken,
    srcReceiver: swapExecutorContractAddress,
    dstReceiver: receiverAddress,
    amount,
    minReturnAmount,
    flags: 0
  }
  const amountNativeDecimals = await exchangeToNativeDecimals(srcToken, amount, provider);

  path = SafeArray.from(arrayLikePath).map((singleSwap) => {
    if (singleSwap.assetIn == ethers.ZeroAddress) singleSwap.assetIn = wethAddress
    if (singleSwap.assetOut == ethers.ZeroAddress) singleSwap.assetOut = wethAddress
    return singleSwap;
  });
  
  const isSingleFactorySwap = path.every(singleSwap => singleSwap.factory === factory)
  let calldata: BytesLike
  if (isSingleFactorySwap) {
    ({ swapDescription, calldata } = await processSingleFactorySwaps(
      factory,
      swapDescription,
      path,
      exchangeContractAddress,
      amountNativeDecimals,
      swapExecutorContractAddress,
      curveRegistryAddress,
      provider
    ))
  } else {
    ({ swapDescription, calldata } = await processMultiFactorySwaps(
      swapDescription,
      path,
      exchangeContractAddress,
      amountNativeDecimals,
      swapExecutorContractAddress,
      curveRegistryAddress,
      provider
    ))
  }

  return { swapDescription, calldata }
}

async function processSingleFactorySwaps(
  factory: Factory,
  swapDescription: LibValidator.SwapDescriptionStruct,
  path: SafeArray<SingleSwap>,
  recipient: string,
  amount: BigNumberish,
  swapExecutorContractAddress: string,
  curveRegistryAddress: string,
  provider: JsonRpcProvider
) {
  let calldata: BytesLike
  switch (factory) {
    case 'OrionV2': {
      swapDescription.srcReceiver = path.first().pool
      calldata = await generateUni2Calls(path, recipient);
      break;
    }
    case 'UniswapV2': {
      swapDescription.srcReceiver = path.first().pool
      calldata = await generateUni2Calls(path, recipient);
      break;
    }
    case 'UniswapV3': {
      calldata = await generateUni3Calls(path, amount, recipient, provider)
      break;
    }
    case 'OrionV3': {
      calldata = await generateOrion3Calls(path, amount, recipient, provider)
      break;
    }
    case 'Curve': {
      if (path.length > 1) {
        throw new Error('Supporting only single stable swap on curve')
      }
      const { pool, assetIn } = path.first()
      const firstToken = ERC20__factory.connect(assetIn, provider)
      const executorAllowance = await firstToken.allowance(swapExecutorContractAddress, pool)
      const calls: BytesLike[] = []
      if (executorAllowance <= BigInt(amount)) {
        const approveCall = await generateApproveCall(
          assetIn,
          pool,
          ethers.MaxUint256
        )
        calls.push(approveCall)
      }
      let curveCall = await generateCurveStableSwapCall(
        amount,
        recipient,
        path.first(),
        provider,
        curveRegistryAddress
      );
      calls.push(curveCall)
      calldata = await generateCalls(calls)
      break;
    }
    default: {
      throw new Error(`Factory ${factory} is not supported`)
    }
  }
  return { swapDescription, calldata }
}

async function processMultiFactorySwaps(
  swapDescription: LibValidator.SwapDescriptionStruct,
  path: SafeArray<SingleSwap>,
  recipient: string,
  amount: BigNumberish,
  swapExecutorContractAddress: string,
  curveRegistryAddress: string,
  provider: JsonRpcProvider
) {
  let calls: BytesLike[] = []
  for (const swap of path) {
    switch (swap.factory) {
      case 'OrionV2': {
        let transferCall = await generateTransferCall(swap.assetIn, swap.pool, 0)
        transferCall = pathCallWithBalance(transferCall, swap.assetIn)
        const uni2Call = await generateUni2Call(swap.pool, swap.assetIn, swap.assetOut, swapExecutorContractAddress)
        calls = calls.concat([transferCall, uni2Call])
        break;
      }
      case 'UniswapV2': {
        let transferCall = await generateTransferCall(swap.assetIn, swap.pool, 0)
        transferCall = pathCallWithBalance(transferCall, swap.assetIn)
        const uni2Call = await generateUni2Call(swap.pool, swap.assetIn, swap.assetOut, swapExecutorContractAddress)
        calls = calls.concat([transferCall, uni2Call])
        break;
      }
      case 'UniswapV3': {
        let uni3Call = await generateUni3Call(swap, 0, swapExecutorContractAddress, provider)
        uni3Call = pathCallWithBalance(uni3Call, swap.assetIn)
        calls.push(uni3Call)
        break;
      }
      case 'OrionV3': {
        let orion3Call = await generateOrion3Call(swap, 0, swapExecutorContractAddress, provider)
        orion3Call = pathCallWithBalance(orion3Call, swap.assetIn)
        calls.push(orion3Call)
        break;
      }
      case 'Curve': {
        const { pool, assetIn } = swap
        const firstToken = ERC20__factory.connect(assetIn, provider)
        const executorAllowance = await firstToken.allowance(swapExecutorContractAddress, pool)
        if (executorAllowance <= BigInt(amount)) {
          const approveCall = await generateApproveCall(
            assetIn,
            pool,
            ethers.MaxUint256
          )
          calls.push(approveCall)
        }
        let curveCall = await generateCurveStableSwapCall(
          amount,
          swapExecutorContractAddress,
          swap,
          provider,
          curveRegistryAddress
        );
        curveCall = pathCallWithBalance(curveCall, swap.assetIn)
        calls.push(curveCall)
        break;
      }
      default: {
        throw new Error(`Factory ${swap.factory} is not supported`)
      }
    }
  }
  const dstToken = swapDescription.dstToken
  let finalTransferCall = await generateTransferCall(dstToken, recipient, 0)
  finalTransferCall = pathCallWithBalance(finalTransferCall, dstToken)
  calls.push(finalTransferCall)
  const calldata = generateCalls(calls)

  return { swapDescription, calldata }
}
