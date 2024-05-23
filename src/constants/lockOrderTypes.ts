export const LOCK_ORDER_TYPES = {
  Order: [
    { name: 'sender', type: 'address' },
    { name: 'expiration', type: 'uint64' },
    { name: 'asset', type: 'string' },
    { name: 'amount', type: 'uint64' },
    { name: 'targetChainId', type: 'uint64' },
    { name: 'secretHash', type: 'bytes32' },
  ],
};
