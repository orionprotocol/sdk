import { SwapExecutor__factory } from "@orionprotocol/contracts/lib/ethers-v6/index.js"
import type { BigNumberish, AddressLike } from "ethers"
import { type CallParams, addCallParams } from "./utils.js"


export function generateFeePaymentCall(
  matcher: AddressLike,
  token: AddressLike,
  amount: BigNumberish,
  callParams?: CallParams
) {

  const executorInterface = SwapExecutor__factory.createInterface()
  const calldata = executorInterface.encodeFunctionData('payFeeToMatcher', [
    matcher,
    token,
    amount
  ])

  return addCallParams(calldata, callParams)
}