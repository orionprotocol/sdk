import { SwapExecutor__factory, UniswapV3Pool__factory } from "@orionprotocol/contracts/lib/ethers-v5/index.js"
import { type BigNumberish, providers, type BytesLike, ethers } from "ethers"
import { SafeArray } from "../../../utils/safeGetters.js"
import type { SwapInfo } from "../generateSwapCalldata.js"
import { addCallParams, generateCalls } from "./utils.js"

export async function generateUni3Call(
  swap: SwapInfo,
  amount: BigNumberish | undefined,
  recipient: string,
  provider: providers.JsonRpcProvider
) {
  if (typeof amount === 'undefined') amount = 0

  const encodedPool = await encodePoolV3(swap.pool, swap.assetIn, swap.assetOut, provider)
  const executorInterface = SwapExecutor__factory.createInterface()
  let calldata = executorInterface.encodeFunctionData('uniswapV3SingleSwapTo', [encodedPool, recipient, amount])

  return addCallParams(calldata)
}

export async function generateOrion3Call(
  swap: SwapInfo,
  amount: BigNumberish | undefined,
  recipient: string,
  provider: providers.JsonRpcProvider
) {
  if (typeof amount === 'undefined') amount = 0

  const encodedPool = await encodePoolV3(swap.pool, swap.assetIn, swap.assetOut, provider)
  const executorInterface = SwapExecutor__factory.createInterface()
  let calldata = executorInterface.encodeFunctionData('orionV3SingleSwapTo', [encodedPool, recipient, amount])

  return addCallParams(calldata)
}

export async function generateUni3Calls(
  path: SafeArray<SwapInfo>,
  amount: BigNumberish,
  recipient: string,
  provider: providers.JsonRpcProvider
) {
  const encodedPools: BytesLike[] = []
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
  path: SafeArray<SwapInfo>,
  amount: BigNumberish,
  recipient: string,
  provider: providers.JsonRpcProvider
) {
  const encodedPools: BytesLike[] = []
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
  provider: providers.JsonRpcProvider
) {
  const pool = UniswapV3Pool__factory.connect(poolAddress, provider)
  const token0 = await pool.token0()
  const zeroForOne = token0.toLowerCase() === assetInAddress.toLowerCase()
  const unwrapWETH = assetOutAddress === ethers.constants.AddressZero

  let encodedPool = ethers.utils.solidityPack(['uint256'], [pool.address])
  encodedPool = ethers.utils.hexDataSlice(encodedPool, 1)
  let firstByte = 0
  if (unwrapWETH) firstByte += 32
  if (!zeroForOne) firstByte += 128
  const encodedFirstByte = ethers.utils.solidityPack(['uint8'], [firstByte])
  encodedPool = ethers.utils.hexlify(ethers.utils.concat([encodedFirstByte, encodedPool]))
  return encodedPool
}