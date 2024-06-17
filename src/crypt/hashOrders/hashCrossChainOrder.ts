import { ethers, keccak256 } from 'ethers';
import type { SupportedChainId, CrossChainOrder } from '../../types';

const ORDER_TYPEHASH =
    '0xb5132db62dfceb466f2f8aee7a039db36a99772e5a9771d28388a5f9baad7c54';
const CROSS_CHAIN_ORDER_TYPEHASH =
    '0xb0edab98a08b4f5ce4f349d7cb1622bde999112acf1ac4a30cc9f394bd7809a6';

export function getOrderHash(order: CrossChainOrder, targetChainId: SupportedChainId) {
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
        Number(targetChainId),
        order.secretHash,
        order.lockOrderExpiration,
      ]
    )
  );

  return orderHash
}
