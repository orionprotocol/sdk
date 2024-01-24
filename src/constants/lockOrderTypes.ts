export const LOCK_ORDER_TYPES = {
  Order: [
    { name: 'user', type: 'address' },
    { name: 'sender', type: 'address' },
    { name: 'expiration', type: 'uint64' },
    { name: 'asset', type: 'string' },
    { name: 'amount', type: 'uint64' },
    { name: 'targetChainId', type: 'uint64' },
    { name: 'secretHash', type: 'string' },
  ],
};
