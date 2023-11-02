import {
  SwapExecutor__factory,
  CurveRegistry__factory,
  ERC20__factory,
} from "@orionprotocol/contracts/lib/ethers-v6/index.js";
import { MaxUint256, type BigNumberish, type JsonRpcProvider } from "ethers";
import { addCallParams } from "./utils.js";
import type { SingleSwap } from "../../../types.js";
import { generateApproveCall } from "./erc20.js";
import type { BytesLike } from "ethers";

export async function generateCurveStableSwapCall(
  amount: BigNumberish,
  to: string,
  swap: SingleSwap,
  provider: JsonRpcProvider,
  swapExecutorContractAddress: string,
  curveRegistry: string
) {
  const executorInterface = SwapExecutor__factory.createInterface();
  const registry = CurveRegistry__factory.connect(curveRegistry, provider);
  const { pool, assetIn, assetOut } = swap;
  const firstToken = ERC20__factory.connect(assetIn, provider)
  const executorAllowance = await firstToken.allowance(swapExecutorContractAddress, pool)

  const calls: BytesLike[] = []
  if (executorAllowance <= BigInt(amount)) {
    const approveCall = await generateApproveCall(
      assetIn,
      pool,
      MaxUint256
    );
    calls.push(approveCall);
  }

  const [i, j] = await registry.get_coin_indices(pool, assetIn, assetOut);
  let calldata = executorInterface.encodeFunctionData(
    "curveSwapStableAmountIn",
    [pool, assetOut, i, j, to, amount]
  );
  calls.push(addCallParams(calldata))

  return calls 
}
