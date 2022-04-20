const ORDER_TYPES = {
  Order: [
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
  ],
};

export default ORDER_TYPES;
