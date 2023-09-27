import { SwapExecutor__factory } from "@orionprotocol/contracts/lib/ethers-v5/index.js"
import { SafeArray } from "../../../utils/safeGetters.js"
import { BigNumber } from "ethers"
import type { BytesLike, BigNumberish } from "ethers"
import { defaultAbiCoder, concat } from "ethers/lib/utils.js"
import type { SwapInfo } from "../generateSwapCalldata.js"
import { addCallParams, generateCalls } from "./utils.js"

export async function generateUni2Calls(
  path: SafeArray<SwapInfo>,
  recipient: string
) {
  const executorInterface = SwapExecutor__factory.createInterface()
  const calls: BytesLike[] = []
  if (path.length > 1) {
    for (let i = 0; i < path.length - 1; ++i) {
      const currentSwap = path.get(i)
      const nextSwap = path.get(i + 1)

      const call = await generateUni2Call(
        currentSwap.pool,
        currentSwap.assetIn,
        currentSwap.assetOut,
        nextSwap.pool
      )
      calls.push(call)
    }
  }
  const lastSwap = path.last();
  const calldata = executorInterface.encodeFunctionData('swapUniV2', [
    lastSwap.pool,
    lastSwap.assetIn,
    lastSwap.assetOut,
    defaultAbiCoder.encode(['uint256'], [concat(['0x03', recipient])]),
  ])
  calls.push(addCallParams(calldata))

  return generateCalls(calls)
}

export async function generateUni2Call(
  pool: string,
  assetIn: string,
  assetOut: string,
  recipient: string,
  fee: BigNumberish = BigNumber.from(3),
) {
  const executorInterface = SwapExecutor__factory.createInterface()
  const calldata = executorInterface.encodeFunctionData('swapUniV2', [
    pool,
    assetIn,
    assetOut,
    defaultAbiCoder.encode(['uint256'], [concat([BigNumber.from(fee).toHexString(), recipient])]),
  ])
  return addCallParams(calldata)
}