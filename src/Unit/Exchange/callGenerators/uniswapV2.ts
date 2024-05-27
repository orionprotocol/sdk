import { SwapExecutor__factory } from "@orionprotocol/contracts/lib/ethers-v6/index.js"
import { SafeArray } from "../../../utils/safeGetters.js"
import { type BytesLike, type BigNumberish, concat, ethers, toBeHex } from "ethers"
import { addCallParams } from "./utils.js"
import type { SingleSwap } from "../../../types.js"
import { BigNumber } from 'bignumber.js';

const BILLION = 1000000000;
const TEN_THOUSANDS = 10000;

function countScaledFee(fee: string) {
  // The count is needed for the swapUniV2Scaled function, where the denominator is one billion
  return new BigNumber(fee).multipliedBy(BILLION).div(TEN_THOUSANDS).toNumber();
}

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
        nextSwap.pool,
        currentSwap.fee
      )
      calls.push(call)
    }
  }

  const lastSwap = path.last();
  const fee = lastSwap.fee ?? 3;
  const scaledFee = countScaledFee(fee.toString());
  const calldata = executorInterface.encodeFunctionData('swapUniV2Scaled', [
    lastSwap.pool,
    lastSwap.assetIn,
    lastSwap.assetOut,
    ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [concat([toBeHex(scaledFee), recipient])]),
  ])
  calls.push(addCallParams(calldata))

  return calls
}

export function generateUni2Call(
  pool: string,
  assetIn: string,
  assetOut: string,
  recipient: string,
  fee: BigNumberish = 3,
) {
  const executorInterface = SwapExecutor__factory.createInterface()
  const scaledFee = countScaledFee(fee.toString());
  const calldata = executorInterface.encodeFunctionData('swapUniV2Scaled', [
    pool,
    assetIn,
    assetOut,
    ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [concat([toBeHex(scaledFee), recipient])]),
  ])
  return addCallParams(calldata)
}
