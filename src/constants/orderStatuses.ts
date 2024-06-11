import subOrderStatuses from './subOrderStatuses.js';

const orderStatuses = [
  ...subOrderStatuses,
  'ROUTING', // order got sub orders, but not all of them have status ACCEPTED
  'TRANSFER', // TX_PENDING > TRANSFER > SETTLED
  'REFUNDED' // TX_PENDING > TRANSFER > CANCELED > REFUNDED
] as const;

export default orderStatuses;
