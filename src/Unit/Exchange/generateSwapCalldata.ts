import type { LibValidator } from "@orionprotocol/contracts/lib/ethers-v6/Exchange.js";
import { ethers, ZeroAddress } from "ethers";
import type {
  AddressLike,
  JsonRpcProvider,
  BigNumberish,
  BytesLike,
} from "ethers";
import cloneDeep from "lodash.clonedeep";
import { safeGet, SafeArray } from "../../utils/safeGetters.js";
import { simpleFetch } from "simple-typed-fetch";
import type Unit from "../index.js";
import {
  generateUni2Calls,
  generateUni2Call,
} from "./callGenerators/uniswapV2.js";
import {
  generateUni3Calls,
  generateOrion3Calls,
  generateUni3Call,
  generateOrion3Call,
} from "./callGenerators/uniswapV3.js";
import {
  exchangeToNativeDecimals,
  generateCalls,
  pathCallWithBalance,
} from "./callGenerators/utils.js";
import { generateTransferCall } from "./callGenerators/erc20.js";
import { generateCurveStableSwapCall } from "./callGenerators/curve.js";
import type { SingleSwap } from "../../types.js";
import { addressLikeToString } from "../../utils/addressLikeToString.js";
import {
  generateUnwrapAndTransferCall,
  generateWrapAndTransferCall,
} from "./callGenerators/weth.js";
import {
  getExchangeAllowance,
  getTotalBalance,
} from "../../utils/getBalance.js";

export type Factory =
  | "UniswapV2"
  | "UniswapV3"
  | "Curve"
  | "OrionV2"
  | "OrionV3";

export type GenerateSwapCalldataWithUnitParams = {
  amount: BigNumberish;
  minReturnAmount: BigNumberish;
  initiatorAddress: string;
  receiverAddress: string;
  path: ArrayLike<SingleSwap>;
  unit: Unit;
};

export type GenerateSwapCalldataParams = {
  amount: BigNumberish;
  minReturnAmount: BigNumberish;
  initiatorAddress: string;
  receiverAddress: string;
  path: ArrayLike<SingleSwap>;
  exchangeContractAddress: AddressLike;
  wethAddress: AddressLike;
  curveRegistryAddress: AddressLike;
  swapExecutorContractAddress: AddressLike;
  provider: JsonRpcProvider;
};

export async function generateSwapCalldataWithUnit({
  amount,
  minReturnAmount,
  initiatorAddress,
  receiverAddress,
  path: arrayLikePath,
  unit,
}: GenerateSwapCalldataWithUnitParams): Promise<{
  calldata: string;
  swapDescription: LibValidator.SwapDescriptionStruct;
  value: bigint;
}> {
  if (arrayLikePath == undefined || arrayLikePath.length == 0) {
    throw new Error("Empty path");
  }
  const wethAddress = safeGet(unit.contracts, "WETH");
  const curveRegistryAddress = safeGet(unit.contracts, "curveRegistry");
  const {
    assetToAddress,
    swapExecutorContractAddress,
    exchangeContractAddress,
  } = await simpleFetch(unit.blockchainService.getInfo)();

  const arrayLikePathCopy = cloneDeep(arrayLikePath);
  let path = SafeArray.from(arrayLikePathCopy);

  path = SafeArray.from(arrayLikePathCopy).map((swapInfo) => {
    swapInfo.assetIn =
      assetToAddress[swapInfo.assetIn] ?? swapInfo.assetIn.toLowerCase();
    swapInfo.assetOut =
      assetToAddress[swapInfo.assetOut] ?? swapInfo.assetOut.toLowerCase();
    return swapInfo;
  });

  return await generateSwapCalldata({
    amount,
    minReturnAmount,
    receiverAddress,
    initiatorAddress,
    path,
    exchangeContractAddress,
    wethAddress,
    curveRegistryAddress,
    swapExecutorContractAddress,
    provider: unit.provider,
  });
}

export async function generateSwapCalldata({
  amount,
  minReturnAmount,
  initiatorAddress,
  receiverAddress,
  path: arrayLikePath,
  exchangeContractAddress,
  wethAddress: wethAddressLike,
  curveRegistryAddress: curveRegistryAddressLike,
  swapExecutorContractAddress: swapExecutorContractAddressLike,
  provider,
}: GenerateSwapCalldataParams): Promise<{
  calldata: string;
  swapDescription: LibValidator.SwapDescriptionStruct;
  value: bigint;
}> {
  const wethAddress = await addressLikeToString(wethAddressLike);
  const curveRegistryAddress = await addressLikeToString(
    curveRegistryAddressLike
  );
  const swapExecutorContractAddress = await addressLikeToString(
    swapExecutorContractAddressLike
  );
  let path = SafeArray.from(arrayLikePath);

  const { assetIn: srcToken } = path.first();
  const { assetOut: dstToken } = path.last();

  let swapDescription: LibValidator.SwapDescriptionStruct = {
    srcToken,
    dstToken,
    srcReceiver: swapExecutorContractAddress,
    dstReceiver: receiverAddress,
    amount,
    minReturnAmount,
    flags: 0,
  };
  const amountNativeDecimals = await exchangeToNativeDecimals(
    srcToken,
    amount,
    provider
  );

  path = SafeArray.from(arrayLikePath).map((singleSwap) => {
    if (singleSwap.assetIn == ethers.ZeroAddress)
      singleSwap.assetIn = wethAddress;
    if (singleSwap.assetOut == ethers.ZeroAddress)
      singleSwap.assetOut = wethAddress;
    return singleSwap;
  });

  let calls: BytesLike[];
  ({ swapDescription, calls } = await processSwaps(
    swapDescription,
    path,
    amountNativeDecimals,
    wethAddress,
    swapExecutorContractAddress,
    curveRegistryAddress,
    provider
  ));
  const calldata = generateCalls(calls);

  const { useExchangeBalance } = await shouldUseExchangeBalance(
    srcToken,
    initiatorAddress,
    exchangeContractAddress,
    amountNativeDecimals,
    provider
  );
  if (useExchangeBalance) {
    // swapDescription.flags = 1n << 255n;
  }
  // const value = srcToken == ZeroAddress ? additionalTransferAmount : 0n;
  return { swapDescription, calldata, value: 0n };
}

async function processSwaps(
  swapDescription: LibValidator.SwapDescriptionStruct,
  path: SafeArray<SingleSwap>,
  amount: BigNumberish,
  wethAddress: string,
  swapExecutorContractAddress: string,
  curveRegistryAddress: string,
  provider: JsonRpcProvider
) {
  const { factory: firstSwapFactory } = path.first();
  const isSingleFactorySwap = path.every(
    (singleSwap) => singleSwap.factory === firstSwapFactory
  );
  let calls: BytesLike[];
  if (isSingleFactorySwap) {
    ({ swapDescription, calls } = await processSingleFactorySwaps(
      firstSwapFactory,
      swapDescription,
      path,
      amount,
      swapExecutorContractAddress,
      curveRegistryAddress,
      provider
    ));
  } else {
    ({ swapDescription, calls } = await processMultiFactorySwaps(
      swapDescription,
      path,
      amount,
      swapExecutorContractAddress,
      curveRegistryAddress,
      provider
    ));
  }
  ({ swapDescription, calls } = await wrapOrUnwrapIfNeeded(
    amount,
    swapDescription,
    calls,
    swapExecutorContractAddress,
    wethAddress
  ));
  return { swapDescription, calls };
}

async function processSingleFactorySwaps(
  factory: Factory,
  swapDescription: LibValidator.SwapDescriptionStruct,
  path: SafeArray<SingleSwap>,
  amount: BigNumberish,
  swapExecutorContractAddress: string,
  curveRegistryAddress: string,
  provider: JsonRpcProvider
) {
  let calls: BytesLike[] = [];
  switch (factory) {
    case "OrionV2": {
      swapDescription.srcReceiver = path.first().pool;
      calls = await generateUni2Calls(path, swapExecutorContractAddress);
      break;
    }
    case "UniswapV2": {
      swapDescription.srcReceiver = path.first().pool;
      calls = await generateUni2Calls(path, swapExecutorContractAddress);
      break;
    }
    case "UniswapV3": {
      calls = await generateUni3Calls(
        path,
        amount,
        swapExecutorContractAddress,
        provider
      );
      break;
    }
    case "OrionV3": {
      calls = await generateOrion3Calls(
        path,
        amount,
        swapExecutorContractAddress,
        provider
      );
      break;
    }
    case "Curve": {
      if (path.length > 1) {
        throw new Error("Supporting only single stable swap on curve");
      }
      calls = await generateCurveStableSwapCall(
        amount,
        swapExecutorContractAddress,
        path.first(),
        provider,
        swapExecutorContractAddress,
        curveRegistryAddress
      );
      break;
    }
    default: {
      throw new Error(`Factory ${factory} is not supported`);
    }
  }
  return { swapDescription, calls };
}

async function processMultiFactorySwaps(
  swapDescription: LibValidator.SwapDescriptionStruct,
  path: SafeArray<SingleSwap>,
  amount: BigNumberish,
  swapExecutorContractAddress: string,
  curveRegistryAddress: string,
  provider: JsonRpcProvider
) {
  let calls: BytesLike[] = [];
  for (const swap of path) {
    switch (swap.factory) {
      case "OrionV2": {
        let transferCall = await generateTransferCall(
          swap.assetIn,
          swap.pool,
          0
        );
        transferCall = pathCallWithBalance(transferCall, swap.assetIn);
        const uni2Call = await generateUni2Call(
          swap.pool,
          swap.assetIn,
          swap.assetOut,
          swapExecutorContractAddress
        );
        calls.push(transferCall, uni2Call);
        break;
      }
      case "UniswapV2": {
        let transferCall = await generateTransferCall(
          swap.assetIn,
          swap.pool,
          0
        );
        transferCall = pathCallWithBalance(transferCall, swap.assetIn);
        const uni2Call = await generateUni2Call(
          swap.pool,
          swap.assetIn,
          swap.assetOut,
          swapExecutorContractAddress
        );
        calls.push(transferCall, uni2Call);
        break;
      }
      case "UniswapV3": {
        let uni3Call = await generateUni3Call(
          swap,
          0,
          swapExecutorContractAddress,
          provider
        );
        uni3Call = pathCallWithBalance(uni3Call, swap.assetIn);
        calls.push(uni3Call);
        break;
      }
      case "OrionV3": {
        let orion3Call = await generateOrion3Call(
          swap,
          0,
          swapExecutorContractAddress,
          provider
        );
        orion3Call = pathCallWithBalance(orion3Call, swap.assetIn);
        calls.push(orion3Call);
        break;
      }
      case "Curve": {
        let curveCalls = await generateCurveStableSwapCall(
          amount,
          swapExecutorContractAddress,
          swap,
          provider,
          swapExecutorContractAddress,
          curveRegistryAddress,
          true
        );
        calls.push(...curveCalls);
        break;
      }
      default: {
        throw new Error(`Factory ${swap.factory} is not supported`);
      }
    }
  }
  return { swapDescription, calls };
}

async function wrapOrUnwrapIfNeeded(
  amount: BigNumberish,
  swapDescription: LibValidator.SwapDescriptionStruct,
  calls: BytesLike[],
  swapExecutorContractAddress: string,
  wethAddress: string
) {
  if (swapDescription.srcToken === ZeroAddress) {
    const wrapCall = generateWrapAndTransferCall(swapDescription.srcReceiver, {
      value: amount,
    });
    swapDescription.srcReceiver = swapExecutorContractAddress;
    calls = ([wrapCall] as BytesLike[]).concat(calls);
  }
  if (swapDescription.dstToken === ZeroAddress) {
    let unwrapCall = generateUnwrapAndTransferCall(
      swapDescription.dstReceiver,
      0
    );
    unwrapCall = pathCallWithBalance(unwrapCall, wethAddress);
    calls.push(unwrapCall);
  } else {
    let transferCall = await generateTransferCall(
      swapDescription.dstToken,
      swapDescription.dstReceiver,
      0
    );
    transferCall = pathCallWithBalance(transferCall, swapDescription.dstToken);
    calls.push(transferCall);
  }
  return { swapDescription, calls };
}

async function shouldUseExchangeBalance(
  srcToken: AddressLike,
  initiatorAddress: AddressLike,
  exchangeContractAddress: AddressLike,
  amount: bigint,
  provider: JsonRpcProvider
) {
  const { exchangeBalance } = await getTotalBalance(
    srcToken,
    initiatorAddress,
    exchangeContractAddress,
    provider
  );
  const exchangeAllowance = await getExchangeAllowance(
    srcToken,
    initiatorAddress,
    exchangeContractAddress,
    provider
  );

  // if (walletBalance + exchangeBalance < amount) {
  //   throw new Error(
  //     `Not enough balance to make swap, totalBalance - ${
  //       walletBalance + exchangeBalance
  //     } swapAmount - ${amount}`
  //   );
  // }
  let useExchangeBalance = true;
  let additionalTransferAmount = 0n;

  if (exchangeBalance == 0n) {
    useExchangeBalance = false;
    additionalTransferAmount = amount;
  } else {
    additionalTransferAmount =
      exchangeBalance >= amount ? 0n : amount - exchangeBalance;
    if (
      srcToken !== ZeroAddress &&
      additionalTransferAmount > exchangeAllowance
    ) {
      throw new Error(
        `Not enough allowance to make swap, allowance - ${exchangeAllowance} needed allowance - ${additionalTransferAmount}`
      );
    }
  }
  return { useExchangeBalance, additionalTransferAmount };
}
