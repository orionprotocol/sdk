const ORDER_TYPES = {
  CrossChainOrder: [
    { name: 'limitOrder', type: 'bytes32' },
    { name: 'chainId', type: 'uint24' },
    { name: 'secretHash', type: 'bytes32' },
    { name: 'lockOrderExpiration', type: 'uint64' },
  ],
};

export default ORDER_TYPES;
