import { SwapExecutor__factory } from "@orionprotocol/contracts/lib/ethers-v5/index.js"
import type { BigNumberish } from "ethers"
import { type CallParams, addCallParams } from "./utils.js"

export async function generateTransferCall(
  token: string,
  target: string,
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

export async function generateApproveCall(
  token: string,
  target: string,
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