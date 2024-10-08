import { SwapExecutor__factory, AeroPool__factory } from "@orionprotocol/contracts/lib/ethers-v6/index.js"
import { type BigNumberish, JsonRpcProvider } from "ethers"
import { SafeArray } from "../../../utils/safeGetters.js"
import { addCallParams } from "./utils.js"
import type { SingleSwap } from "../../../types.js"

export async function generateAeroCalls(
  path: SafeArray<SingleSwap>,
  amount: BigNumberish,
  recipient: string,
  provider: JsonRpcProvider
) {
  const pools: string[] = [];
  const direct: boolean[] = [];
  for (const swap of path) {
    pools.push(swap.pool);

    const token0 = await AeroPool__factory.connect(swap.pool, provider).token0();
    direct.push(swap.assetIn.toLowerCase() === token0.toLowerCase());
  }

  const executorInterface = SwapExecutor__factory.createInterface()
  let calldata = executorInterface.encodeFunctionData('swapAeroMulti', [pools, direct, amount, recipient]);
  calldata = addCallParams(calldata)

  return [calldata]
}
