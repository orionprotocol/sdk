import { BigNumber } from 'bignumber.js';
import { ethers } from 'ethers';
import { INTERNAL_PROTOCOL_PRECISION } from '../constants';
import ORDER_TYPES from '../constants/orderTypes.js';
import type { CrossOrder, Order, SignedOrder, SupportedChainId } from '../types.js';
import normalizeNumber from '../utils/normalizeNumber.js';
import getDomainData from './getDomainData.js';
import hashOrder from './hashOrder.js';
import generateSecret from '../utils/generateSecret';

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
}: SignOrderProps) => {
  const nonce = Date.now();
  const expiration = nonce + DEFAULT_EXPIRATION;
  // const secretHash = ethers.keccak256(secret);

  const isCrossChain = targetChainId === undefined || targetChainId !== chainId;

  const order: Order | CrossOrder = {
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
        targetChainId
      }
      : {}),
    buySide: side === 'BUY' ? 1 : 0,
    // chainId,
    // secretHash,
    // lockOrderExpiration: expiration
  };

  const limitOrder = {
    senderAddress,
    matcherAddress,
    baseAsset: baseAssetAddress,
    quoteAsset: quoteAssetAddress,
    matcherFeeAsset: serviceFeeAssetAddress,
    amount: normalizeNumber(
      amount,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_FLOOR,
    ),
    price: normalizeNumber(
      price,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_FLOOR,
    ),
    matcherFee: normalizeNumber(
      matcherFee,
      INTERNAL_PROTOCOL_PRECISION,
      BigNumber.ROUND_CEIL, // ROUND_CEIL because we don't want get "not enough fee" error
    ),
    nonce: BigInt(nonce),
    expiration: BigInt(expiration),
    buySide: side === 'BUY' ? 1 : 0,
  };

  // const limitOrderHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(limitOrder)));
  // Generate the orderParamsHash
  const orderParamsHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'address', 'address', 'address', 'uint64', 'uint64', 'uint64', 'uint64', 'uint64', 'uint8'],
    [
      limitOrder.senderAddress,
      limitOrder.matcherAddress,
      limitOrder.baseAsset,
      limitOrder.quoteAsset,
      limitOrder.matcherFeeAsset,
      limitOrder.amount,
      limitOrder.price,
      limitOrder.matcherFee,
      limitOrder.nonce,
      limitOrder.expiration,
      limitOrder.buySide
    ]
  ));

  const secret = generateSecret();
  const secretHash = ethers.keccak256(secret);

  console.log(limitOrder, chainId, secretHash, expiration);

  // Type hash from Solidity contract
  const CROSS_CHAIN_ORDER_TYPEHASH = ethers.keccak256(ethers.toUtf8Bytes('Order(address senderAddress,address matcherAddress,address baseAsset,address quoteAsset,address matcherFeeAsset,uint64 amount,uint64 price,uint64 matcherFee,uint64 nonce,uint64 expiration,uint8 buySide,uint24 chainId,bytes32 secretHash,uint64 lockOrderExpiration)'))

  // Generate the full crossChainOrder hash
  const crossChainOrderHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'bytes32', 'uint24', 'bytes32', 'uint64'],
    [CROSS_CHAIN_ORDER_TYPEHASH, orderParamsHash, Number(chainId), secretHash, BigInt(expiration)]
  ));

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
    ...(isCrossChain ? { secret, secretHash: crossChainOrderHash, targetChainId } : {})
  };
  return signedOrder;
};

export default signOrder;
