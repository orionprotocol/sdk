export const ORDER_TYPE = [
  { name: 'senderAddress', type: 'address' },
  { name: 'matcherAddress', type: 'address' },
  { name: 'baseAsset', type: 'address' },
  { name: 'quoteAsset', type: 'address' },
  { name: 'matcherFeeAsset', type: 'address' },
  { name: 'amount', type: 'uint64' },
  { name: 'price', type: 'uint64' },
  { name: 'matcherFee', type: 'uint64' },
  { name: 'nonce', type: 'uint64' },
  { name: 'expiration', type: 'uint64' },
  { name: 'buySide', type: 'uint8' },
];

export const ORDER_TYPES = {
  Order: ORDER_TYPE
}

export const CROSS_CHAIN_ORDER_TYPES = {
  Order: ORDER_TYPE,
  CrossChainOrder: [
    { name: 'limitOrder', type: 'Order' },
    { name: 'targetChainId', type: 'uint24' },
    { name: 'secretHash', type: 'bytes32' },
    { name: 'lockOrderExpiration', type: 'uint64' },
  ]
}
