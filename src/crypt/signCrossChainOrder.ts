import { BigNumber } from 'bignumber.js';
import type { ethers } from 'ethers';
import { keccak256 } from 'ethers';
import { INTERNAL_PROTOCOL_PRECISION } from '../constants';
import { CROSS_CHAIN_ORDER_TYPES } from '../constants/orderTypes/orderTypes';
import type { Order, SignedCrossChainOrder, SupportedChainId } from '../types.js';
import normalizeNumber from '../utils/normalizeNumber.js';
import getDomainData from './getDomainData.js';
import generateSecret from '../utils/generateSecret';
import { getOrderHash } from './hashOrders';

const DAY = 24 * 60 * 60 * 1000;
const LOCK_ORDER_EXPIRATION = 4 * DAY;
const DEFAULT_EXPIRATION = 29 * DAY;

export type SignCrossChainOrderProps = {
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
  targetChainId: SupportedChainId
}

export const signCrossChainOrder = async ({
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
}: SignCrossChainOrderProps): Promise<SignedCrossChainOrder> => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;
  const lockOrderExpiration = nonce + LOCK_ORDER_EXPIRATION;

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
    buySide: side === 'BUY' ? 1 : 0
  };

  const secret = generateSecret();
  const secretHash = keccak256(secret);

  const crossChainOrder = {
    limitOrder: order,
    targetChainId: Number(targetChainId),
    secretHash,
    lockOrderExpiration
  }

  const signature = await signer.signTypedData(
    getDomainData(chainId),
    CROSS_CHAIN_ORDER_TYPES,
    crossChainOrder
  );

  const signedOrderWithoutId: Omit<SignedCrossChainOrder, 'id'> = {
    ...order,
    signature,
    secret,
    secretHash,
    targetChainId: Number(targetChainId),
    lockOrderExpiration
  }
  const orderHash = getOrderHash(signedOrderWithoutId, targetChainId);

  const signedCrossChainOrder: SignedCrossChainOrder = {
    ...signedOrderWithoutId,
    id: orderHash
  };

  return signedCrossChainOrder;
};