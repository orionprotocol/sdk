export const LOCK_ORDER_TYPES = {
  Order: [
    { name: 'sender', type: 'address' },
    { name: 'expiration', type: 'uint64' },
    { name: 'asset', type: 'address' },
    { name: 'amount', type: 'uint64' },
    { name: 'targetChainId', type: 'uint24' },
    { name: 'secretHash', type: 'bytes32' },
  ],
};
