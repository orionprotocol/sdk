const CFD_ORDER_TYPES = {
  CFDOrder: [
    { name: 'senderAddress', type: 'address' },
    { name: 'matcherAddress', type: 'address' },
    { name: 'instrumentAddress', type: 'address' },
    { name: 'amount', type: 'uint64' },
    { name: 'price', type: 'uint64' },
    { name: 'matcherFee', type: 'uint64' },
    { name: 'nonce', type: 'uint64' },
    { name: 'expiration', type: 'uint64' },
    { name: 'buySide', type: 'uint8' },
  ],
};

export default CFD_ORDER_TYPES;
