import { SwapExecutor__factory } from "@orionprotocol/contracts/lib/ethers-v6/index.js"
import type { BigNumberish, AddressLike } from "ethers"
import { type CallParams, addCallParams } from "./utils.js"

export function generateTransferCall(
  token: AddressLike,
  target: AddressLike,
  amount: BigNumberish,
  callParams?: CallParams
) {

  const executorInterface = SwapExecutor__factory.createInterface()
  const calldata = executorInterface.encodeFunctionData('safeTransfer', [
    token,
    target,
    amount
  ])

  return addCallParams(calldata, callParams)
}

export function generateApproveCall(
  token: AddressLike,
  target: AddressLike,
  amount: BigNumberish,
  callParams?: CallParams
) {
  const executorInterface = SwapExecutor__factory.createInterface()
  const calldata = executorInterface.encodeFunctionData('safeApprove', [
    token,
    target,
    amount
  ])

  return addCallParams(calldata, callParams)
}