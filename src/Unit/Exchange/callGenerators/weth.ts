import { SwapExecutor__factory } from "@orionprotocol/contracts/lib/ethers-v6-cjs/index.js"
import type { BigNumberish } from "ethers"
import { type CallParams, addCallParams } from "./utils.js"
import type { AddressLike } from "ethers"

export function generateWrapAndTransferCall(
  target: AddressLike,
  callParams?: CallParams
) {

  const executorInterface = SwapExecutor__factory.createInterface()
  const calldata = executorInterface.encodeFunctionData('wrapAndTransfer', [
    target,
  ])

  return addCallParams(calldata, callParams)
}

export function generateUnwrapAndTransferCall(
  target: AddressLike,
  amount: BigNumberish,
  callParams?: CallParams
) {

  const executorInterface = SwapExecutor__factory.createInterface()
  const calldata = executorInterface.encodeFunctionData('unwrapAndTransfer', [
    target,
    amount
  ])

  return addCallParams(calldata, callParams)
}