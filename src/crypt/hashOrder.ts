import { ethers, keccak256 } from 'ethers';
import type { Order } from '../types.js';
import generateSecret from '../utils/generateSecret';
import getDomainData from './getDomainData';
import type { SupportedChainId } from '../../lib';

const CROSS_CHAIN_ORDER_TYPEHASH = '0xcb145a2347f48eab4e3341a245f53da2e686e47ef421c89a6b40dde27a063c3f'
const EIP712_DOMAIN_TYPEHASH = '0xa604fff5a27d5951f334ccda7abff3286a8af29caeeb196a6f2b40a1dce7612b';

export default function getOrderHash(order: Order, chainId: SupportedChainId) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder()
  const secret = generateSecret();
  const secretHash = ethers.keccak256(secret);

  // Generate the orderParamsHash
  const orderParamsHash = keccak256((abiCoder.encode(
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

  // Generate the full crossChainOrder hash
  const orderHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'bytes32', 'uint24', 'bytes32', 'uint64'],
    [CROSS_CHAIN_ORDER_TYPEHASH, orderParamsHash, 97, '0x74a00e5cceb68d791486ddb9ea83bb8245eca22f67cb0ea81342f6eff8bf6e51', 1718955340461]
  ));

  const domainData = getDomainData(chainId);
  // Generate the full crossChainOrder hash
  const domainSeparator = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'bytes32', 'bytes32', 'uint256', 'bytes32'],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    [EIP712_DOMAIN_TYPEHASH, ethers.keccak256(ethers.toUtf8Bytes(domainData?.name as string)), ethers.keccak256(ethers.toUtf8Bytes(domainData?.version as string)), Number(domainData.chainId), domainData.salt]
  ));

  const digest = ethers.solidityPackedKeccak256(
    ['bytes', 'bytes32', 'bytes32'], ['0x1901', domainSeparator, orderHash]
  );

  console.log({ secretHash }, { orderParamsHash }, { orderHash }, { domainData }, { domainSeparator }, { digest });

  return { secret, secretHash, orderHash };
}
