import type { ExchangeWithGenericSwap } from '@orionprotocol/contracts/lib/ethers-v6/Exchange.js';
import { UniswapV3Pool__factory, ERC20__factory, SwapExecutor__factory, CurveRegistry__factory } from '@orionprotocol/contracts/lib/ethers-v6';
import { ethers, type BigNumberish, type AddressLike, concat, type BytesLike } from 'ethers';
import { safeGet, SafeArray } from '../../utils/safeGetters.js';
import type Unit from '../index.js';
import { simpleFetch } from 'simple-typed-fetch';
import { BigNumber } from 'bignumber.js';

const EXECUTOR_SWAP_FUNCTION = 'func_70LYiww'

export type SwapInfo = {
  pool: string
  assetIn: string
  assetOut: string
  factory: string
}

export type CallParams = {
  isMandatory?: boolean
  target?: string
  gaslimit?: BigNumber
  value?: BigNumber
}

export type GenerateSwapCalldataParams = {
  amount: BigNumberish
  minReturnAmount: BigNumberish
  receiverAddress: string
  path: ArrayLike<SwapInfo>
  unit: Unit
}

export default async function generateSwapCalldata({
  amount,
  minReturnAmount,
  receiverAddress,
  path: path_,
  unit
}: GenerateSwapCalldataParams
): Promise<{ calldata: string, swapDescription: ExchangeWithGenericSwap.SwapDescriptionStruct }> {
  if (path_ == undefined || path_.length == 0) {
    throw new Error('Empty path');
  }
  const wethAddress = safeGet(unit.contracts, 'WETH')
  const curveRegistryAddress = safeGet(unit.contracts, 'curveRegistry')
  const { assetToAddress, swapExecutorContractAddress, exchangeContractAddress } = await simpleFetch(unit.blockchainService.getInfo)();
  let path = SafeArray.from(path_).map((swapInfo) => {
    swapInfo.assetIn = assetToAddress[swapInfo.assetIn] ?? swapInfo.assetIn.toLowerCase();
    swapInfo.assetOut = assetToAddress[swapInfo.assetOut] ?? swapInfo.assetOut.toLowerCase();
    return swapInfo;
  })
  const factory = path.first().factory
  if (!path.every(swapInfo => swapInfo.factory === factory)) {
    throw new Error('Supporting only swaps with single factory');
  }
  const swapDescription: ExchangeWithGenericSwap.SwapDescriptionStruct = {
    srcToken: path.first().assetIn,
    dstToken: path.last().assetOut,
    srcReceiver: swapExecutorContractAddress ?? '',
    dstReceiver: receiverAddress,
    amount,
    minReturnAmount,
    flags: 0
  }

  const exchangeToNativeDecimals = async (token: AddressLike) => {
    if (typeof token !== 'string' && 'getAddress' in token) {
      token = await token.getAddress();
    } else {
      token = await token
    }
    let decimals = 18n
    if (token !== ethers.ZeroAddress) {
      const contract = ERC20__factory.connect(token, unit.provider)
      decimals = await contract.decimals()
    }
    return BigNumber(amount.toString()).multipliedBy(BigNumber(10).pow(decimals.toString())).div(BigNumber(10).pow(8))
  }
  const amountNativeDecimals = await exchangeToNativeDecimals(swapDescription.srcToken);

  path = SafeArray.from(path_).map((swapInfo) => {
    if (swapInfo.assetIn == ethers.ZeroAddress) swapInfo.assetIn = wethAddress
    if (swapInfo.assetOut == ethers.ZeroAddress) swapInfo.assetOut = wethAddress
    return swapInfo;
  });

  let calldata: string
  switch (factory) {
    case 'OrionV2': {
      swapDescription.srcReceiver = path.first().pool
      calldata = await generateUni2Calls(exchangeContractAddress, path);
      break;
    }
    case 'UniswapV2': {
      swapDescription.srcReceiver = path.first().pool
      calldata = await generateUni2Calls(exchangeContractAddress, path);
      break;
    }
    case 'UniswapV3': {
      calldata = await generateUni3Calls(amountNativeDecimals.toString(), exchangeContractAddress, path, unit.provider)
      break;
    }
    case 'OrionV3': {
      calldata = await generateOrion3Calls(amountNativeDecimals.toString(), exchangeContractAddress, path, unit.provider)
      break;
    }
    case 'Curve': {
      calldata = await generateCurveStableSwapCalls(
        amountNativeDecimals.toString(),
        exchangeContractAddress,
        swapExecutorContractAddress ?? '',
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

      const calldata = executorInterface.encodeFunctionData('swapUniV2', [
        currentSwap.pool,
        currentSwap.assetIn,
        currentSwap.assetOut,
        ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [concat(['0x03', nextSwap.pool])]),
      ]
      )
      calls.push(addCallParams(calldata))
    }
  }
  const lastSwap = path.last();
  const calldata = executorInterface.encodeFunctionData('swapUniV2', [
    lastSwap.pool,
    lastSwap.assetIn,
    lastSwap.assetOut,
    ethers.AbiCoder.defaultAbiCoder().encode(['uint256'], [concat(['0x03', exchangeAddress])]),
  ])
  calls.push(addCallParams(calldata))

  return await generateCalls(calls)
}

async function generateUni3Calls(
  amount: BigNumberish,
  exchangeContractAddress: string,
  path: SafeArray<SwapInfo>,
  provider: ethers.JsonRpcApiProvider
) {
  const encodedPools: string[] = []
  for (const swap of path) {
    const pool = UniswapV3Pool__factory.connect(swap.pool, provider)
    const token0 = await pool.token0()
    const zeroForOne = token0.toLowerCase() === swap.assetIn.toLowerCase()
    const unwrapWETH = swap.assetOut === ethers.ZeroAddress

    let encodedPool = ethers.solidityPacked(['uint256'], [await pool.getAddress()])
    encodedPool = ethers.dataSlice(encodedPool, 1)
    let firstByte = 0
    if (unwrapWETH) firstByte += 32
    if (!zeroForOne) firstByte += 128
    const encodedFirstByte = ethers.solidityPacked(['uint8'], [firstByte])
    encodedPool = ethers.hexlify(ethers.concat([encodedFirstByte, encodedPool]))
    encodedPools.push(encodedPool)
  }
  const executorInterface = SwapExecutor__factory.createInterface()
  let calldata = executorInterface.encodeFunctionData('uniswapV3SwapTo', [encodedPools, exchangeContractAddress, amount])
  calldata = addCallParams(calldata)

  return await generateCalls([calldata])
}

async function generateOrion3Calls(
  amount: BigNumberish,
  exchangeContractAddress: string,
  path: SafeArray<SwapInfo>,
  provider: ethers.JsonRpcApiProvider
) {
  const encodedPools: string[] = []
  for (const swap of path) {
    const pool = UniswapV3Pool__factory.connect(swap.pool, provider)
    const token0 = await pool.token0()
    const zeroForOne = token0.toLowerCase() === swap.assetIn.toLowerCase()
    const unwrapWETH = swap.assetOut === ethers.ZeroAddress

    let encodedPool = ethers.solidityPacked(['uint256'], [await pool.getAddress()])
    encodedPool = ethers.dataSlice(encodedPool, 1)
    let firstByte = 0
    if (unwrapWETH) firstByte += 32
    if (!zeroForOne) firstByte += 128
    const encodedFirstByte = ethers.solidityPacked(['uint8'], [firstByte])
    encodedPool = ethers.hexlify(ethers.concat([encodedFirstByte, encodedPool]))
    encodedPools.push(encodedPool)
  }
  const executorInterface = SwapExecutor__factory.createInterface()
  let calldata = executorInterface.encodeFunctionData('orionV3SwapTo', [encodedPools, exchangeContractAddress, amount])
  calldata = addCallParams(calldata)

  return await generateCalls([calldata])
}

async function generateCurveStableSwapCalls(
  amount: BigNumberish,
  exchangeContractAddress: string,
  executorAddress: string,
  path: SafeArray<SwapInfo>,
  provider: ethers.JsonRpcProvider,
  curveRegistry: string
) {
  if (path.length > 1) {
    throw new Error('Supporting only single stable swap on curve')
  }
  const executorInterface = SwapExecutor__factory.createInterface()
  const registry = CurveRegistry__factory.connect(curveRegistry, provider)

  const swap = path.first()
  const firstToken = ERC20__factory.connect(swap.assetIn, provider)
  const { pool, assetIn, assetOut } = swap
  const [i, j,] = await registry.get_coin_indices(pool, assetIn, assetOut)

  const executorAllowance = await firstToken.allowance(executorAddress, swap.pool)
  const calls: BytesLike[] = []
  if (executorAllowance < BigInt(amount)) {
    const calldata = addCallParams(
      executorInterface.encodeFunctionData('safeApprove', [
        swap.assetIn,
        swap.pool,
        ethers.MaxUint256
      ])
    )
    calls.push(calldata)
  }
  let calldata = executorInterface.encodeFunctionData('curveSwapStableAmountIn', [
    pool,
    assetOut,
    i,
    j,
    amount,
    0,
    exchangeContractAddress])

  calldata = addCallParams(calldata)
  calls.push(calldata)

  return await generateCalls(calls)
}

// Adds additional byte to single swap with settings
function addCallParams(
  calldata: BytesLike,
  callParams?: CallParams
) {
  let firstByte = 0
  if (callParams) {
    if (callParams.value !== undefined) {
      firstByte += 16 // 00010000
      const encodedValue = ethers.solidityPacked(['uint128'], [callParams.value])
      calldata = ethers.hexlify(ethers.concat([encodedValue, calldata]))
    }
    if (callParams.target !== undefined) {
      firstByte += 32 // 00100000
      const encodedAddress = ethers.solidityPacked(['address'], [callParams.target])
      calldata = ethers.hexlify(ethers.concat([encodedAddress, calldata]))
    }
    if (callParams.gaslimit !== undefined) {
      firstByte += 64 // 01000000
      const encodedGaslimit = ethers.solidityPacked(['uint32'], [callParams.gaslimit])
      calldata = ethers.hexlify(ethers.concat([encodedGaslimit, calldata]))
    }
    if (callParams.isMandatory !== undefined) firstByte += 128 // 10000000
  }

  const encodedFirstByte = ethers.solidityPacked(['uint8'], [firstByte])
  calldata = ethers.hexlify(ethers.concat([encodedFirstByte, calldata]))
  return calldata
}

function generateCalls(calls: BytesLike[]) {
  const executorInterface = SwapExecutor__factory.createInterface()
  return '0x' + executorInterface.encodeFunctionData(EXECUTOR_SWAP_FUNCTION, [ethers.ZeroAddress, calls]).slice(74)
}
