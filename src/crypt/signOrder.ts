import { BigNumber } from 'bignumber.js';
import { ethers, keccak256 } from 'ethers';
import { INTERNAL_PROTOCOL_PRECISION } from '../constants';
import ORDER_TYPES from '../constants/orderTypes.js';
import type { Order, SignedOrder, SupportedChainId } from '../types.js';
import normalizeNumber from '../utils/normalizeNumber.js';
import getDomainData from './getDomainData.js';
import generateSecret from '../utils/generateSecret';
import { getOrderHash } from './hashOrder';

const DAY = 24 * 60 * 60 * 1000;
const LOCK_ORDER_EXPIRATION = 4 * DAY;
const DEFAULT_EXPIRATION = 29 * DAY;

export type SignOrderProps = {
  baseAssetAddress: string
  quoteAssetAddress: string
  side: 'BUY' | 'SELL'
  price: BigNumber.Value
  amount: BigNumber.Value
  matcherFee: BigNumber.Value
  senderAddress: string
  matcherAddress: string
  serviceFeeAssetAddress: string
  signer: ethers.Signer
  chainId: SupportedChainId
  targetChainId?: SupportedChainId
}

export const signOrder = async ({
  amount,
  signer,
  side,
  baseAssetAddress,
  quoteAssetAddress,
  serviceFeeAssetAddress,
  matcherFee,
  matcherAddress,
  senderAddress,
  targetChainId,
  chainId,
  price
}: SignOrderProps): Promise<SignedOrder> => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;
  const lockOrderExpiration = nonce + LOCK_ORDER_EXPIRATION;

  const isCrossChain = targetChainId === undefined || targetChainId !== chainId;

  const order: Order = {
    senderAddress,
    matcherAddress,
    baseAsset: baseAssetAddress,
    quoteAsset: quoteAssetAddress,
    matcherFeeAsset: serviceFeeAssetAddress,
    amount: Number(normalizeNumber(
      amount,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_FLOOR,
    )),
    price: Number(normalizeNumber(
      price,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_FLOOR,
    )),
    matcherFee: Number(normalizeNumber(
      matcherFee,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_CEIL, // ROUND_CEIL because we don't want get "not enough fee" error
    )),
    nonce,
    expiration,
    ...(isCrossChain
      ? {
        targetChainId: Number(targetChainId)
      }
      : {}),
    buySide: side === 'BUY' ? 1 : 0
  };

  const secret = generateSecret();
  const secretHash = keccak256(secret);

  const crossChainOrder = {
    limitOrder: order,
    chainId: Number(chainId),
    secretHash,
    lockOrderExpiration
  }

  // TODO: change what to show
  const signature = await signer.signTypedData(
    getDomainData(chainId),
    ORDER_TYPES,
    crossChainOrder
  );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = ethers.Signature.from(signature).serialized;

  // if (!fixedSignature) throw new Error("Can't sign order");
  const signedOrderWithoutId: Omit<SignedOrder, 'id'> = {
    ...order,
    signature: fixedSignature,
    secret,
    secretHash,
    ...(isCrossChain
      ? {
        targetChainId: Number(targetChainId)
      }
      : {}),
    lockOrderExpiration
  }
  const orderHash = getOrderHash(signedOrderWithoutId, chainId);

  const signedOrder: SignedOrder = {
    ...signedOrderWithoutId,
    id: orderHash
  };
  return signedOrder;
};

export default signOrder;
