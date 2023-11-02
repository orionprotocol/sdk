import { SwapExecutor__factory } from "@orionprotocol/contracts/lib/ethers-v6/index.js"
import { SafeArray } from "../../../utils/safeGetters.js"
import { type BytesLike, type BigNumberish, concat, ethers, toBeHex } from "ethers"
import { addCallParams } from "./utils.js"
import type { SingleSwap } from "../../../types.js"

export async function generateUni2Calls(
  path: SafeArray<SingleSwap>,
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
    ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [concat(['0x03', recipient])]),
  ])
  calls.push(addCallParams(calldata))

  return calls
}

export async function generateUni2Call(
  pool: string,
  assetIn: string,
  assetOut: string,
  recipient: string,
  fee: BigNumberish = 3,
) {
  const executorInterface = SwapExecutor__factory.createInterface()
  const calldata = executorInterface.encodeFunctionData('swapUniV2', [
    pool,
    assetIn,
    assetOut,
    ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [concat([toBeHex(fee), recipient])]),
  ])
  return addCallParams(calldata)
}