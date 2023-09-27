import type { PromiseOrValue } from "@orionprotocol/contracts/lib/ethers-v5/common.js"
import { ERC20__factory, SwapExecutor__factory } from "@orionprotocol/contracts/lib/ethers-v5/index.js"
import { type BytesLike, ethers, BigNumber, type BigNumberish, providers } from "ethers"

const EXECUTOR_SWAP_FUNCTION = 'func_70LYiww'

export type CallParams = {
  isMandatory?: boolean,
  target?: string,
  gaslimit?: BigNumber,
  value?: BigNumber
}

export type PatchParams = {
  skipOnZeroAmount?: boolean,
  skipCallDataPatching?: boolean,
  skipValuePatching?: boolean
}

export function pathCallWithBalance(
  calldata: BytesLike,
  tokenAddress: string,
  patchParams: PatchParams = { skipCallDataPatching: false, skipValuePatching: true }
) {
  const executorInterface = SwapExecutor__factory.createInterface()
  const skipMaskAndOffset = createPatchMask(calldata, patchParams)
  calldata = executorInterface.encodeFunctionData("patchCallWithTokenBalance", [
    calldata,
    skipMaskAndOffset,
    tokenAddress,
    ethers.constants.MaxUint256])
  return addCallParams(calldata)
}

export function addCallParams(
  calldata: BytesLike,
  callParams?: CallParams
) {
  let firstByte = 0
  if (callParams) {
    if (callParams.value !== undefined) {
      firstByte += 16 // 00010000
      const encodedValue = ethers.utils.solidityPack(['uint128'], [callParams.value])
      calldata = ethers.utils.hexlify(ethers.utils.concat([encodedValue, calldata]))
    }
    if (callParams.target !== undefined) {
      firstByte += 32 // 00100000
      const encodedAddress = ethers.utils.solidityPack(['address'], [callParams.target])
      calldata = ethers.utils.hexlify(ethers.utils.concat([encodedAddress, calldata]))
    }
    if (callParams.gaslimit !== undefined) {
      firstByte += 64 // 01000000
      const encodedGaslimit = ethers.utils.solidityPack(['uint32'], [callParams.gaslimit])
      calldata = ethers.utils.hexlify(ethers.utils.concat([encodedGaslimit, calldata]))
    }
    if (callParams.isMandatory !== undefined) firstByte += 128 // 10000000
  }

  const encodedFirstByte = ethers.utils.solidityPack(['uint8'], [firstByte])
  calldata = ethers.utils.hexlify(ethers.utils.concat([encodedFirstByte, calldata]))
  return calldata
}

export function createPatchMask(calldata: BytesLike, patchParams?: PatchParams) {
  let firstByte = 0
  let mask = ethers.utils.solidityPack(["uint256"], [(calldata.length - 4) / 2 - 32])
  mask = ethers.utils.hexDataSlice(mask, 1)
  if (patchParams) {
    if (patchParams.skipOnZeroAmount !== undefined && patchParams.skipOnZeroAmount === false) {
      firstByte += 32
      console.log(firstByte)
    }
    if (patchParams.skipCallDataPatching !== undefined && patchParams.skipCallDataPatching) {
      firstByte += 64
      console.log(firstByte)
    }
    if (patchParams.skipValuePatching !== undefined && patchParams.skipValuePatching) {
      firstByte += 128
      console.log(firstByte)
    }
  }
  const encodedFirstByte = ethers.utils.solidityPack(["uint8"], [firstByte])
  mask = ethers.utils.hexlify(ethers.utils.concat([encodedFirstByte, mask]))
  console.log(mask)
  return mask
}

export function generateCalls(calls: BytesLike[]) {
  const executorInterface = SwapExecutor__factory.createInterface()
  return '0x' + executorInterface.encodeFunctionData(EXECUTOR_SWAP_FUNCTION, [ethers.constants.AddressZero, calls]).slice(74)
}

export async function exchangeToNativeDecimals(token: PromiseOrValue<string>, amount: BigNumberish, provider: providers.JsonRpcProvider) {
  token = await token
  let decimals = 18
  if (token !== ethers.constants.AddressZero) {
    const contract = ERC20__factory.connect(token, provider)
    decimals = await contract.decimals()
  }
  return BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals)).div(BigNumber.from(10).pow(8))
}