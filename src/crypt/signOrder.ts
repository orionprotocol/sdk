import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { INTERNAL_PROTOCOL_PRECISION, ORDER_TYPES } from '../constants';
import type { Order, SignedOrder, SupportedChainId } from '../types.js';
import normalizeNumber from '../utils/normalizeNumber.js';
import getDomainData from './getDomainData.js';
import hashOrder from './hashOrders/hashOrder';

const DEFAULT_EXPIRATION = 29 * 24 * 60 * 60 * 1000; // 29 days

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
}

export const signOrder = async ({
  senderAddress,
  serviceFeeAssetAddress,
  baseAssetAddress,
  quoteAssetAddress,
  matcherFee,
  matcherAddress,
  chainId,
  signer,
  side,
  amount,
  price
}: SignOrderProps) => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;

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
    buySide: side === 'BUY' ? 1 : 0,
  };

  const signature = await signer.signTypedData(
    getDomainData(chainId),
    ORDER_TYPES,
    order,
  );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = ethers.Signature.from(signature).serialized;

  // if (!fixedSignature) throw new Error("Can't sign order");

  const signedOrder: SignedOrder = {
    ...order,
    id: hashOrder(order),
    signature: fixedSignature,
  };
  return signedOrder;
};
