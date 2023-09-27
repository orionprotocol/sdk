import type { ExchangeWithGenericSwap } from '@orionprotocol/contracts/lib/ethers-v5/Exchange.js';
import { ERC20__factory } from '@orionprotocol/contracts/lib/ethers-v5/index.js';
import { type BytesLike, ethers, type BigNumberish, providers } from 'ethers';
import { safeGet, SafeArray } from '../../utils/safeGetters.js';
import { simpleFetch } from 'simple-typed-fetch';
import type Unit from '../index.js';
import { generateUni2Calls, generateUni2Call } from './callGenerators/uniswapV2.js';
import { generateUni3Calls, generateOrion3Calls, generateUni3Call, generateOrion3Call } from './callGenerators/uniswapV3.js';
import { exchangeToNativeDecimals, generateCalls, pathCallWithBalance } from './callGenerators/utils.js';
import { generateApproveCall, generateTransferCall } from './callGenerators/erc20.js';
import { generateCurveStableSwapCall } from './callGenerators/curve.js';

export type Factory = "UniswapV2" | "UniswapV3" | "Curve" | "OrionV2" | "OrionV3"

export type SwapInfo = {
  pool: string
  assetIn: string
  assetOut: string
  factory: Factory
}

export type GenerateSwapCalldataParams = {
  amount: BigNumberish
  minReturnAmount: BigNumberish
  receiverAddress: string
  path: ArrayLike<SwapInfo>
  unit: Unit
}

export default async function generateSwapCalldata({
  amount,
  minReturnAmount,
  receiverAddress,
  path: arrayLikePath,
  unit
}: GenerateSwapCalldataParams
): Promise<{ calldata: string, swapDescription: ExchangeWithGenericSwap.SwapDescriptionStruct }> {
  if (arrayLikePath == undefined || arrayLikePath.length == 0) {
    throw new Error('Empty path');
  }
  const wethAddress = safeGet(unit.contracts, 'WETH')
  const curveRegistryAddress = safeGet(unit.contracts, 'curveRegistry')
  const { assetToAddress, swapExecutorContractAddress, exchangeContractAddress } = await simpleFetch(unit.blockchainService.getInfo)();
  let path = SafeArray.from(arrayLikePath).map((swapInfo) => {
    swapInfo.assetIn = safeGet(assetToAddress, swapInfo.assetIn);
    swapInfo.assetOut = safeGet(assetToAddress, swapInfo.assetOut);
    return swapInfo;
  })

  const { factory, assetIn: srcToken } = path.first()
  const dstToken = path.last().assetOut

  let swapDescription: ExchangeWithGenericSwap.SwapDescriptionStruct = {
    srcToken: srcToken,
    dstToken: dstToken,
    srcReceiver: swapExecutorContractAddress,
    dstReceiver: receiverAddress,
    amount,
    minReturnAmount,
    flags: 0
  }
  const amountNativeDecimals = await exchangeToNativeDecimals(srcToken, amount, unit.provider);

  path = SafeArray.from(arrayLikePath).map((swapInfo) => {
    if (swapInfo.assetIn == ethers.constants.AddressZero) swapInfo.assetIn = wethAddress
    if (swapInfo.assetOut == ethers.constants.AddressZero) swapInfo.assetOut = wethAddress
    return swapInfo;
  });
  const isSingleFactorySwap = path.every(swapInfo => swapInfo.factory === factory)
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
      unit.provider
    ))
  } else {
    ({ swapDescription, calldata } = await processMultiFactorySwaps(
      swapDescription,
      path,
      exchangeContractAddress,
      amountNativeDecimals,
      swapExecutorContractAddress,
      curveRegistryAddress,
      unit.provider
    ))
  }

  return { swapDescription, calldata }
}

async function processSingleFactorySwaps(
  factory: Factory,
  swapDescription: ExchangeWithGenericSwap.SwapDescriptionStruct,
  path: SafeArray<SwapInfo>,
  recipient: string,
  amount: BigNumberish,
  swapExecutorContractAddress: string,
  curveRegistryAddress: string,
  provider: providers.JsonRpcProvider
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
      if (executorAllowance.lt(amount)) {
          const approveCall = await generateApproveCall(
            assetIn,
            pool,
            ethers.constants.MaxUint256
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
  swapDescription: ExchangeWithGenericSwap.SwapDescriptionStruct,
  path: SafeArray<SwapInfo>,
  recipient: string,
  amount: BigNumberish,
  swapExecutorContractAddress: string,
  curveRegistryAddress: string,
  provider: providers.JsonRpcProvider
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
        if (executorAllowance.lt(amount)) {
            const approveCall = await generateApproveCall(
              assetIn,
              pool,
              ethers.constants.MaxUint256
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
  const dstToken = await swapDescription.dstToken
  let finalTransferCall = await generateTransferCall(dstToken, recipient, 0)
  finalTransferCall = pathCallWithBalance(finalTransferCall, dstToken)
  calls.push(finalTransferCall)
  const calldata = await generateCalls(calls)

  return { swapDescription, calldata }
}