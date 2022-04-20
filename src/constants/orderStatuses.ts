import subOrderStatuses from './subOrderStatuses';

// https://github.com/orionprotocol/orion-aggregator/blob/develop/src/main/java/io/orionprotocol/aggregator/model/order/status/OrderStatus.java
const orderStatuses = [
  ...subOrderStatuses,
  'ROUTING', // order got sub orders, but not all of them have status ACCEPTED
] as const;

export default orderStatuses;
