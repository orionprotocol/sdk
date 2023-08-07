import type { ExchangeWithGenericSwap } from '@orionprotocol/contracts/lib/ethers-v5/Exchange.js';
import { UniswapV3Pool__factory, ERC20__factory, SwapExecutor__factory, CurveRegistry__factory } from '@orionprotocol/contracts/lib/ethers-v5/index.js';
import { BigNumber, ethers } from 'ethers';
import { concat, defaultAbiCoder, type BytesLike } from 'ethers/lib/utils.js';
import must, { safeGet, SafeArray } from '../../utils/safeGetters.js';
import type Unit from '../index.js';
import { simpleFetch } from 'simple-typed-fetch';

const EXECUTOR_SWAP_FUNCTION = "func_70LYiww"

export type Factory = "UniswapV2" | "UniswapV3" | "Curve" | "OrionV2" | "OrionV3"

export type SwapInfo = {
  pool: string,
  assetIn: string,
  assetOut: string,
  factory: Factory
}

export type CallParams = {
  isMandatory?: boolean,
  target?: string,
  gaslimit?: BigNumber,
  value?: BigNumber
}

export type GenerateSwapCalldataParams = {
  amount: string,
  minReturnAmount: string,
  receiverAddress: string,
  path: ArrayLike<SwapInfo>,
  exchangeContractAddress?: string,
  swapExecutorContractAddress?: string,
  unit: Unit
}

export default async function generateSwapCalldata({
  amount,
  minReturnAmount,
  receiverAddress,
  path: path_,
  exchangeContractAddress,
  swapExecutorContractAddress,
  unit
}: GenerateSwapCalldataParams
): Promise<{ calldata: string, swapDescription: ExchangeWithGenericSwap.SwapDescriptionStruct }> {
  const wethAddress = safeGet(unit.contracts, "WETH")
  const curveRegistryAddress = safeGet(unit.contracts, "curveRegistry")
  if (swapExecutorContractAddress === undefined || swapExecutorContractAddress === undefined) {
    const info = await simpleFetch(unit.blockchainService.getInfo)();
    if (swapExecutorContractAddress === undefined) swapExecutorContractAddress = info.swapExecutorContractAddress
    if (exchangeContractAddress === undefined) exchangeContractAddress = info.exchangeContractAddress
  }
  must(swapExecutorContractAddress !== undefined)
  must(exchangeContractAddress !== undefined)

  const path = SafeArray.from(path_)

  if (path == undefined || path.length == 0) {
    throw new Error(`Empty path`);
  }
  const factory = path.first().factory
  if (!path.every(e => e.factory === factory)) {
    throw new Error(`Supporting only swaps with single factory`);
  }

  const swapDescription: ExchangeWithGenericSwap.SwapDescriptionStruct = {
    srcToken: path.first().assetIn,
    dstToken: path.last().assetOut,
    srcReceiver: swapExecutorContractAddress,
    dstReceiver: receiverAddress,
    amount: amount,
    minReturnAmount: minReturnAmount,
    flags: 0
  }

  let calldata: string
  switch (factory) {
    case "OrionV2": {
      swapDescription.srcReceiver = path.first().pool
      calldata = await generateUni2Calls(exchangeContractAddress, path);
      break;
    }
    case "UniswapV2": {
      swapDescription.srcReceiver = path.first().pool
      calldata = await generateUni2Calls(exchangeContractAddress, path);
      break;
    }
    case "UniswapV3": {
      calldata = await generateUni3Calls(amount, exchangeContractAddress, wethAddress, path, unit.provider)
      break;
    }
    case "OrionV3": {
      calldata = await generateOrion3Calls(amount, exchangeContractAddress, wethAddress, path, unit.provider)
      break;
    }
    case "Curve": {
      calldata = await generateCurveStableSwapCalls(
        amount,
        exchangeContractAddress,
        swapExecutorContractAddress,
        path,
        unit.provider,
        curveRegistryAddress
      );
      break;
    }
    default: {
      throw new Error(`Factory ${factory} is not supported`)
    }
  }
  return { swapDescription, calldata }
}



export async function generateUni2Calls(
  exchangeAddress: string,
  path: SafeArray<SwapInfo>
) {
  const executorInterface = SwapExecutor__factory.createInterface()
  const calls: BytesLike[] = []
  if (path.length > 1) {
    for (let i = 0; i < path.length - 1; ++i) {
      const currentSwap = path.get(i)
      const nextSwap = path.get(i + 1)

      const calldata = executorInterface.encodeFunctionData("swapUniV2", [
        currentSwap.pool,
        currentSwap.assetIn,
        currentSwap.assetOut,
        defaultAbiCoder.encode(["uint256"], [concat(["0x03", nextSwap.pool])]),
      ]
      )
      calls.push(addCallParams(calldata))
    }
  }
  const lastSwap = path.last();
  const calldata = executorInterface.encodeFunctionData("swapUniV2", [
    lastSwap.pool,
    lastSwap.assetIn,
    lastSwap.assetOut,
    defaultAbiCoder.encode(["uint256"], [concat(["0x03", exchangeAddress])]),
  ])
  calls.push(addCallParams(calldata))

  return generateCalls(calls)
}

async function generateUni3Calls(
  amount: string,
  exchangeContractAddress: string,
  weth: string,
  path: SafeArray<SwapInfo>,
  provider: ethers.providers.JsonRpcProvider
) {
  const encodedPools: BytesLike[] = []
  for (const swap of path) {
    const pool = UniswapV3Pool__factory.connect(swap.pool, provider)
    const token0 = await pool.token0()
    const zeroForOne = token0 === swap.assetIn
    const unwrapWETH = swap.assetOut === ethers.constants.AddressZero
    if (unwrapWETH) {
      swap.assetOut = weth
    }

    let encodedPool = ethers.utils.solidityPack(["uint256"], [pool.address])
    encodedPool = ethers.utils.hexDataSlice(encodedPool, 1)
    let firstByte = 0
    if (unwrapWETH) firstByte += 32
    if (!zeroForOne) firstByte += 128
    const encodedFirstByte = ethers.utils.solidityPack(["uint8"], [firstByte])
    encodedPool = ethers.utils.hexlify(ethers.utils.concat([encodedFirstByte, encodedPool]))
    encodedPools.push(encodedPool)
  }
  const executorInterface = SwapExecutor__factory.createInterface()
  let calldata = executorInterface.encodeFunctionData("uniswapV3SwapTo", [encodedPools, exchangeContractAddress, amount])
  calldata = addCallParams(calldata)

  return generateCalls([calldata])
}

async function generateOrion3Calls(
  amount: string,
  exchangeContractAddress: string,
  weth: string,
  path: SafeArray<SwapInfo>,
  provider: ethers.providers.JsonRpcProvider
) {
  const encodedPools: BytesLike[] = []
  for (const swap of path) {
    const pool = UniswapV3Pool__factory.connect(swap.pool, provider)
    const token0 = await pool.token0()
    const zeroForOne = token0 === swap.assetIn
    const unwrapWETH = swap.assetOut === ethers.constants.AddressZero
    if (unwrapWETH) {
      swap.assetOut = weth
    }

    let encodedPool = ethers.utils.solidityPack(["uint256"], [pool.address])
    encodedPool = ethers.utils.hexDataSlice(encodedPool, 1)
    let firstByte = 0
    if (unwrapWETH) firstByte += 32
    if (!zeroForOne) firstByte += 128
    const encodedFirstByte = ethers.utils.solidityPack(["uint8"], [firstByte])
    encodedPool = ethers.utils.hexlify(ethers.utils.concat([encodedFirstByte, encodedPool]))
    encodedPools.push(encodedPool)
  }
  const executorInterface = SwapExecutor__factory.createInterface()
  let calldata = executorInterface.encodeFunctionData("orionV3SwapTo", [encodedPools, exchangeContractAddress, amount])
  calldata = addCallParams(calldata)

  return generateCalls([calldata])
}

async function generateCurveStableSwapCalls(
  amount: string,
  exchangeContractAddress: string,
  executorAddress: string,
  path: SafeArray<SwapInfo>,
  provider: ethers.providers.JsonRpcProvider,
  curveRegistry: string
) {
  if (path.length > 1) {
    throw new Error("Supporting only single stable swap on curve")
  }
  const executorInterface = SwapExecutor__factory.createInterface()
  const registry = CurveRegistry__factory.connect(curveRegistry, provider)

  const swap = path.first()
  const firstToken = ERC20__factory.connect(swap.assetIn, provider)
  const { pool, assetIn, assetOut } = swap
  const [i, j,] = await registry.get_coin_indices(pool, assetIn, assetOut)

  const executorAllowance = await firstToken.allowance(executorAddress, swap.pool)
  const calls: BytesLike[] = []
  if (executorAllowance.lt(amount)) {
    const calldata = addCallParams(
      executorInterface.encodeFunctionData("safeApprove", [
        swap.assetIn,
        swap.pool,
        ethers.constants.MaxUint256
      ])
    )
    calls.push(calldata)
  }
  let calldata = executorInterface.encodeFunctionData("curveSwapStableAmountIn", [
    pool,
    assetOut,
    i,
    j,
    amount,
    0,
    exchangeContractAddress])

  calldata = addCallParams(calldata)
  calls.push(calldata)

  return generateCalls(calls)
}

// Adds additional byte to single swap with settings
function addCallParams(
  calldata: BytesLike,
  callParams?: CallParams
) {
  let firstByte = 0
  if (callParams) {
    if (callParams.value !== undefined) { 
      firstByte += 16 // 00000010
      const encodedValue = ethers.utils.solidityPack(["uint128"], [callParams.value])
      calldata = ethers.utils.hexlify(ethers.utils.concat([encodedValue, calldata]))
    }
    if (callParams.target !== undefined) {
      firstByte += 32 // 00000100
      const encodedAddress = ethers.utils.solidityPack(["address"], [callParams.target])
      calldata = ethers.utils.hexlify(ethers.utils.concat([encodedAddress, calldata]))
    }
    if (callParams.gaslimit !== undefined) {
      firstByte += 64 // 00000100
      const encodedGaslimit = ethers.utils.solidityPack(["uint32"], [callParams.gaslimit])
      calldata = ethers.utils.hexlify(ethers.utils.concat([encodedGaslimit, calldata]))
    }
    if (callParams.isMandatory !== undefined) firstByte += 128 // 00001000
  }

  const encodedFirstByte = ethers.utils.solidityPack(["uint8"], [firstByte])
  calldata = ethers.utils.hexlify(ethers.utils.concat([encodedFirstByte, calldata]))
  return calldata
}


async function generateCalls(calls: BytesLike[]) {
  const executorInterface = SwapExecutor__factory.createInterface()
  return "0x" + executorInterface.encodeFunctionData(EXECUTOR_SWAP_FUNCTION, [ethers.constants.AddressZero, calls]).slice(74)
}