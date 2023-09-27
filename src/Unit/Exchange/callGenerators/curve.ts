import { SwapExecutor__factory, CurveRegistry__factory } from "@orionprotocol/contracts/lib/ethers-v5/index.js"
import type { BigNumberish, providers } from "ethers"
import type { SwapInfo } from "../generateSwapCalldata.js"

export async function generateCurveStableSwapCall(
  amount: BigNumberish,
  to: string,
  swap: SwapInfo,
  provider: providers.JsonRpcProvider,
  curveRegistry: string
) {
  const executorInterface = SwapExecutor__factory.createInterface()
  const registry = CurveRegistry__factory.connect(curveRegistry, provider)
  const { pool, assetIn, assetOut } = swap
  const [i, j,] = await registry.get_coin_indices(pool, assetIn, assetOut)

  let calldata = executorInterface.encodeFunctionData('curveSwapStableAmountIn', [
    pool,
    assetOut,
    i,
    j,
    to,
    amount,
  ])

  return calldata
}