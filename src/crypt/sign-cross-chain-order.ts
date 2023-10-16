import { BigNumber } from "bignumber.js";
import { ethers } from "ethers";
import { INTERNAL_PROTOCOL_PRECISION } from "../constants/index.js";
import CROSS_CHAIN_ORDER_TYPES from "../constants/cross-chain-order-types.js";
import type {
  CrossChainOrder,
  SignedCrossChainOrder,
  SupportedChainId,
} from "../types.js";
import normalizeNumber from "../utils/normalizeNumber.js";
import getDomainData from "./getDomainData.js";
import signOrderPersonal from "./signOrderPersonal.js";
import hashCrossChainOrder from "./hashCrossChainOrder.js";

const DEFAULT_EXPIRATION = 29 * 24 * 60 * 60 * 1000; // 29 days

export const signCrossChainOrder = async (
  baseAssetAddr: string,
  quoteAssetAddr: string,
  side: "BUY" | "SELL",
  price: BigNumber.Value,
  amount: BigNumber.Value,
  matcherFee: BigNumber.Value,
  senderAddress: string,
  matcherAddress: string,
  serviceFeeAssetAddr: string,
  usePersonalSign: boolean,
  secret: string,
  targetChainId: number,
  signer: ethers.Signer,
  chainId: SupportedChainId
) => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;
  const secretHash = ethers.keccak256(secret);

  const order: CrossChainOrder = {
    senderAddress,
    matcherAddress,
    baseAsset: baseAssetAddr,
    quoteAsset: quoteAssetAddr,
    matcherFeeAsset: serviceFeeAssetAddr,
    amount: Number(
      normalizeNumber(
        amount,
        INTERNAL_PROTOCOL_PRECISION,
        BigNumber.ROUND_FLOOR
      )
    ),
    price: Number(
      normalizeNumber(price, INTERNAL_PROTOCOL_PRECISION, BigNumber.ROUND_FLOOR)
    ),
    matcherFee: Number(
      normalizeNumber(
        matcherFee,
        INTERNAL_PROTOCOL_PRECISION,
        BigNumber.ROUND_CEIL // ROUND_CEIL because we don't want get "not enough fee" error
      )
    ),
    nonce,
    expiration,
    buySide: side === "BUY" ? 1 : 0,
    isPersonalSign: usePersonalSign,
    secret,
    secretHash,
    targetChainId,
  };

  const signature = usePersonalSign
    ? await signOrderPersonal(order, signer)
    : await signer.signTypedData(
        getDomainData(chainId),
        CROSS_CHAIN_ORDER_TYPES,
        order
      );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = ethers.Signature.from(signature).serialized;

  // if (!fixedSignature) throw new Error("Can't sign order");

  const signedOrder: SignedCrossChainOrder = {
    ...order,
    id: hashCrossChainOrder(order),
    signature: fixedSignature,
  };
  return signedOrder;
};

export default signCrossChainOrder;
