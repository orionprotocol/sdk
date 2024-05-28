import { BigNumber } from 'bignumber.js';
import { ethers, keccak256 } from 'ethers';
import { INTERNAL_PROTOCOL_PRECISION } from '../constants';
import ORDER_TYPES from '../constants/orderTypes.js';
import type { Order, SignedOrder, SupportedChainId } from '../types.js';
import normalizeNumber from '../utils/normalizeNumber.js';
import getDomainData from './getDomainData.js';
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
        targetChainId
      }
      : {}),
    buySide: side === 'BUY' ? 1 : 0
  };

  const secret = generateSecret();
  const secretHash = keccak256(secret);

  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  // Generate the orderParamsHash
  const limitOrderHash = keccak256((abiCoder.encode(
    ['address', 'address', 'address', 'address', 'address', 'uint64', 'uint64', 'uint64', 'uint64', 'uint64', 'uint8'],
    [
      order.senderAddress,
      order.matcherAddress,
      order.baseAsset,
      order.quoteAsset,
      order.matcherFeeAsset,
      order.amount,
      order.price,
      order.matcherFee,
      order.nonce,
      order.expiration,
      order.buySide
    ]
  )));

  const crossChainOrder = {
    limitOrder: limitOrderHash,
    chainId: Number(chainId),
    secretHash,
    lockOrderExpiration: expiration
  }

  // Generate the full crossChainOrder hash
  // const orderHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
  //     ['bytes32', 'bytes32', 'uint24', 'bytes32', 'uint64'],
  //     [CROSS_CHAIN_ORDER_TYPEHASH, orderParamsHash, 97, '0x74a00e5cceb68d791486ddb9ea83bb8245eca22f67cb0ea81342f6eff8bf6e51', 1718955340461]
  // ));

  // TODO: change what to show
  const signature = await signer.signTypedData(
    getDomainData(chainId),
    ORDER_TYPES,
    {
      order,
      ...crossChainOrder,
    }
  );

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = ethers.Signature.from(signature).serialized;

  // if (!fixedSignature) throw new Error("Can't sign order");
  // const { orderHash, secret, secretHash } = hashOrder(limitOrder, chainId);

  const signedOrder: SignedOrder = {
    ...order,
    id: limitOrderHash, // TODO: change to orderHash
    signature: fixedSignature,
    ...(isCrossChain ? { secret, secretHash, targetChainId: Number(targetChainId) } : {})
  };
  return signedOrder;
};

export default signOrder;
