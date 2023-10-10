import { ERC20__factory, SwapExecutor__factory } from "@orionprotocol/contracts/lib/ethers-v6/index.js"
import type { AddressLike } from "ethers"
import { type BytesLike, ethers, type BigNumberish } from "ethers"

const EXECUTOR_SWAP_FUNCTION = 'func_70LYiww'

export type CallParams = {
  isMandatory?: boolean,
  target?: string,
  gaslimit?: BigNumberish,
  value?: BigNumberish
}

export type PatchParams = {
  skipOnZeroAmount?: boolean,
  skipCallDataPatching?: boolean,
  skipValuePatching?: boolean
}

export function pathCallWithBalance(
  calldata: BytesLike,
  tokenAddress: AddressLike,
  patchParams: PatchParams = { skipCallDataPatching: false, skipValuePatching: true }
) {
  const executorInterface = SwapExecutor__factory.createInterface()
  const skipMaskAndOffset = createPatchMask(calldata, patchParams)
  calldata = executorInterface.encodeFunctionData("patchCallWithTokenBalance", [
    calldata,
    skipMaskAndOffset,
    tokenAddress,
    ethers.MaxUint256])
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

export function createPatchMask(calldata: BytesLike, patchParams?: PatchParams) {
  let firstByte = 0
  let mask = ethers.solidityPacked(["uint256"], [(calldata.length - 4) / 2 - 32]) //finding offset of last 32 bytes slot in calldata
  mask = ethers.dataSlice(mask, 1)
  if (patchParams) {
    if (patchParams.skipOnZeroAmount !== undefined && patchParams.skipOnZeroAmount === false) {
      firstByte += 32
    }
    if (patchParams.skipCallDataPatching !== undefined && patchParams.skipCallDataPatching) {
      firstByte += 64
    }
    if (patchParams.skipValuePatching !== undefined && patchParams.skipValuePatching) {
      firstByte += 128
    }
  }
  const encodedFirstByte = ethers.solidityPacked(["uint8"], [firstByte])
  mask = ethers.hexlify(ethers.concat([encodedFirstByte, mask]))
  return mask
}

export function generateCalls(calls: BytesLike[]) {
  const executorInterface = SwapExecutor__factory.createInterface()
  return '0x' + executorInterface.encodeFunctionData(EXECUTOR_SWAP_FUNCTION, [ethers.ZeroAddress, calls]).slice(74)
}

export async function exchangeToNativeDecimals(token: AddressLike, amount: BigNumberish, provider: ethers.JsonRpcProvider) {
  token = await token
  if (typeof token !== "string") token = await token.getAddress()

  let decimals = 18n
  if (token !== ethers.ZeroAddress) {
    const contract = ERC20__factory.connect(token, provider)
    decimals = BigInt(await contract.decimals())
  }
  return BigInt(amount) * (BigInt(10) ** decimals) / (BigInt(10) ** 8n)
}