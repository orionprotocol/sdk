import { SwapExecutor__factory, UniswapV3Pool__factory } from "@orionprotocol/contracts/lib/ethers-v6/index.js"
import { ethers } from "ethers";
import type { JsonRpcProvider , BigNumberish } from "ethers";
import type { SafeArray } from "../../../utils/safeGetters.js"
import { addCallParams, generateCalls } from "./utils.js"
import type { SingleSwap } from "../../../types.js"

export async function generateUni3Call(
  swap: SingleSwap,
  amount: BigNumberish | undefined,
  recipient: string,
  provider: JsonRpcProvider
) {
  if (typeof amount === 'undefined') {
    amount = 0
  }

  const encodedPool = await encodePoolV3(swap.pool, swap.assetIn, swap.assetOut, provider)
  const executorInterface = SwapExecutor__factory.createInterface()
  const calldata = executorInterface.encodeFunctionData('uniswapV3SingleSwapTo', [encodedPool, recipient, amount])

  return addCallParams(calldata)
}

export async function generateOrion3Call(
  swap: SingleSwap,
  amount: BigNumberish | undefined,
  recipient: string,
  provider: JsonRpcProvider
) {
  if (amount === undefined) {
    amount = 0
  }

  const encodedPool = await encodePoolV3(swap.pool, swap.assetIn, swap.assetOut, provider)
  const executorInterface = SwapExecutor__factory.createInterface()
  const calldata = executorInterface.encodeFunctionData('orionV3SingleSwapTo', [encodedPool, recipient, amount])

  return addCallParams(calldata)
}

export async function generateUni3Calls(
  path: SafeArray<SingleSwap>,
  amount: BigNumberish,
  recipient: string,
  provider: JsonRpcProvider
) {
  const encodedPools: BigNumberish[] = []
  for (const swap of path) {
    const encodedPool = await encodePoolV3(swap.pool, swap.assetIn, swap.assetOut, provider)
    encodedPools.push(encodedPool)
  }
  const executorInterface = SwapExecutor__factory.createInterface()
  let calldata = executorInterface.encodeFunctionData('uniswapV3SwapTo', [encodedPools, recipient, amount])
  calldata = addCallParams(calldata)

  return generateCalls([calldata])
}

export async function generateOrion3Calls(
  path: SafeArray<SingleSwap>,
  amount: BigNumberish,
  recipient: string,
  provider: JsonRpcProvider
) {
  const encodedPools: BigNumberish[] = []
  for (const swap of path) {
    const encodedPool = await encodePoolV3(swap.pool, swap.assetIn, swap.assetOut, provider)
    encodedPools.push(encodedPool)
  }
  const executorInterface = SwapExecutor__factory.createInterface()
  let calldata = executorInterface.encodeFunctionData('orionV3SwapTo', [encodedPools, recipient, amount])
  calldata = addCallParams(calldata)

  return generateCalls([calldata])
}

export async function encodePoolV3(
  poolAddress: string,
  assetInAddress: string,
  assetOutAddress: string,
  provider: JsonRpcProvider
) {
  const pool = UniswapV3Pool__factory.connect(poolAddress, provider)
  const token0 = await pool.token0()
  const zeroForOne = token0.toLowerCase() === assetInAddress.toLowerCase()
  const unwrapWETH = assetOutAddress === ethers.ZeroAddress

  let encodedPool = ethers.solidityPacked(['uint256'], [await pool.getAddress()])
  encodedPool = ethers.dataSlice(encodedPool, 1)
  let firstByte = 0
  if (unwrapWETH) firstByte += 32
  if (!zeroForOne) firstByte += 128
  const encodedFirstByte = ethers.solidityPacked(['uint8'], [firstByte])
  encodedPool = ethers.hexlify(ethers.concat([encodedFirstByte, encodedPool]))
  return encodedPool
}