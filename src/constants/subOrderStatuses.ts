// https://github.com/orionprotocol/orion-aggregator/blob/develop/src/main/java/io/orionprotocol/aggregator/model/order/status/SubOrderStatus.java
const subOrderStatuses = [
  'NEW', // created, wasn't added to IOB or wasn't accepted by the broker
  'ACCEPTED', // added to IOB or accepted by the broker
  'PARTIALLY_FILLED', // partially filled
  'FILLED', // fully filled
  'TX_PENDING', // sub order was filled and at least one of its trades is pending
  'CANCELED', // canceled by user or by expiration
  'REJECTED', // rejected by broker
  'FAILED', // at least one trade failed
  'SETTLED', // all trades successfully settled
  'NOT_FOUND', // broker not processed sub order yet
] as const;

export default subOrderStatuses;
