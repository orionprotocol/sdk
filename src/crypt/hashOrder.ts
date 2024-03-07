import { ethers, keccak256 } from 'ethers';
import type { Order } from '../types.js';

const ORDER_TYPEHASH = "0xb5132db62dfceb466f2f8aee7a039db36a99772e5a9771d28388a5f9baad7c54"

export default function getOrderHash(order: Order) {
	const abiCoder = ethers.AbiCoder.defaultAbiCoder()

	const { senderAddress, matcherAddress, baseAsset, quoteAsset, matcherFeeAsset, amount, price, matcherFee, nonce, expiration, buySide } = order
	const orderBytes = abiCoder.encode(
		["bytes32", "address", "address", "address", "address", "address", "uint64", "uint64", "uint64", "uint64", "uint64", "uint8"],
		[ORDER_TYPEHASH, senderAddress, matcherAddress, baseAsset, quoteAsset, matcherFeeAsset, amount, price, matcherFee, nonce, expiration, buySide]
	)

	return keccak256(orderBytes)
}