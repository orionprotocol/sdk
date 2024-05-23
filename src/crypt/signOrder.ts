import { BigNumber } from 'bignumber.js';
import { ethers, keccak256 } from 'ethers';
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

  // const limitOrder = {
  //   senderAddress,
  //   matcherAddress,
  //   baseAsset: baseAssetAddress,
  //   quoteAsset: quoteAssetAddress,
  //   matcherFeeAsset: serviceFeeAssetAddress,
  //   amount: normalizeNumber(
  //     amount,
  //     INTERNAL_PROTOCOL_PRECISION,
  //     BigNumber.ROUND_FLOOR,
  //   ),
  //   price: normalizeNumber(
  //     price,
  //     INTERNAL_PROTOCOL_PRECISION,
  //     BigNumber.ROUND_FLOOR,
  //   ),
  //   matcherFee: normalizeNumber(
  //     matcherFee,
  //     INTERNAL_PROTOCOL_PRECISION,
  //     BigNumber.ROUND_CEIL, // ROUND_CEIL because we don't want get "not enough fee" error
  //   ),
  //   nonce: BigInt(nonce),
  //   expiration: BigInt(expiration),
  //   buySide: side === 'BUY' ? 1 : 0,
  // };
  const mockLimit = {
    senderAddress: '0xb07f292216d845dce4887777ec44a18566ca0e95',
    matcherAddress: '0xfbcad2c3a90fbd94c335fbdf8e22573456da7f68',
    baseAsset: '0xcb2951e90d8dcf16e1fa84ac0c83f48906d6a744',
    quoteAsset: '0xf223eca06261145b3287a0fefd8cfad371c7eb34',
    matcherFeeAsset: '0xf223eca06261145b3287a0fefd8cfad371c7eb34',
    amount: 2000000000,
    price: 66490000,
    matcherFee: 49730783,
    nonce: 1716449740461,
    expiration: 1718955340461,
    buySide: 0,
  }

  // const limitOrderHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(limitOrder)));
  // Generate the orderParamsHash
  const orderParamsHash = keccak256((ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'address', 'address', 'address', 'uint64', 'uint64', 'uint64', 'uint64', 'uint64', 'uint8'],
    [
      mockLimit.senderAddress,
      mockLimit.matcherAddress,
      mockLimit.baseAsset,
      mockLimit.quoteAsset,
      mockLimit.matcherFeeAsset,
      mockLimit.amount,
      mockLimit.price,
      mockLimit.matcherFee,
      mockLimit.nonce,
      mockLimit.expiration,
      mockLimit.buySide
    ]
  )));

  const secret = generateSecret();
  const secretHash = ethers.keccak256(secret);

  // Type hash from Solidity contract
  const CROSS_CHAIN_ORDER_TYPEHASH = '0xcb145a2347f48eab4e3341a245f53da2e686e47ef421c89a6b40dde27a063c3f'

  // Generate the full crossChainOrder hash
  const crossChainOrderHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'bytes32', 'uint24', 'bytes32', 'uint64'],
    [CROSS_CHAIN_ORDER_TYPEHASH, orderParamsHash, 97, '0x74a00e5cceb68d791486ddb9ea83bb8245eca22f67cb0ea81342f6eff8bf6e51', 1718955340461]
  ));

  const signature = await signer.signTypedData(
    getDomainData(chainId),
    ORDER_TYPES,
    order,
  );

  const EIP712_DOMAIN_TYPEHASH = '0xa604fff5a27d5951f334ccda7abff3286a8af29caeeb196a6f2b40a1dce7612b';
  // const EIP712_DOMAIN_TYPEHASH1 = ethers.keccak256(ethers.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,bytes32 salt)'));

  const domainData = getDomainData(chainId);
  // Generate the full crossChainOrder hash
  const DOMAIN_SEPARATOR = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'bytes32', 'bytes32', 'uint256', 'bytes32'],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    [EIP712_DOMAIN_TYPEHASH, ethers.keccak256(ethers.toUtf8Bytes(domainData?.name as string)), ethers.keccak256(ethers.toUtf8Bytes(domainData?.version as string)), Number(domainData.chainId), domainData.salt]
  ));

  // const digest = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
  //   ['bytes', 'bytes32', 'bytes32'], ['\x19\x01', DOMAIN_SEPARATOR, crossChainOrderHash]
  // ));

  const digest = ethers.solidityPackedKeccak256(
    ['bytes', 'bytes32', 'bytes32'], ['0x1901', DOMAIN_SEPARATOR, crossChainOrderHash]
  );

  console.log('digest', digest)

  // https://github.com/poap-xyz/poap-fun/pull/62#issue-928290265
  // "Signature's v was always send as 27 or 28, but from Ledger was 0 or 1"
  const fixedSignature = ethers.Signature.from(signature).serialized;

  // if (!fixedSignature) throw new Error("Can't sign order");

  const signedOrder: SignedOrder = {
    ...order,
    id: hashOrder(order),
    signature: fixedSignature,
    ...(isCrossChain ? { secret: crossChainOrderHash, secretHash, targetChainId } : {})
  };
  return signedOrder;
};

export default signOrder;
