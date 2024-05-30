import { ethers, keccak256 } from 'ethers';
import type { SupportedChainId, CrossChainOrder } from '../../types';

const ORDER_TYPEHASH =
    '0xb5132db62dfceb466f2f8aee7a039db36a99772e5a9771d28388a5f9baad7c54';
const CROSS_CHAIN_ORDER_TYPEHASH =
    '0xc4666edeecc42a94cf6b87f39e1ca967792e6d738224365e54d7d06ec632b05c';

export function getOrderHash(order: CrossChainOrder, chainId: SupportedChainId) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();

  // Generate the orderParamsHash
  const limitOrderHash = keccak256(
    abiCoder.encode(
      [
        'bytes32',
        'address',
        'address',
        'address',
        'address',
        'address',
        'uint64',
        'uint64',
        'uint64',
        'uint64',
        'uint64',
        'uint8',
      ],
      [
        ORDER_TYPEHASH,
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
        order.buySide,
      ]
    )
  );
  const orderHash = keccak256(
    abiCoder.encode(
      ['bytes32', 'bytes32', 'uint24', 'bytes32', 'uint64'],
      [
        CROSS_CHAIN_ORDER_TYPEHASH,
        limitOrderHash,
        Number(chainId),
        order.secretHash,
        order.lockOrderExpiration,
      ]
    )
  );

  return orderHash
}
