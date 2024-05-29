import subOrderStatuses from './subOrderStatuses.js';

const orderStatuses = [
  ...subOrderStatuses,
  'ROUTING', // order got sub orders, but not all of them have status ACCEPTED
  'TRANSFER' // TX_PENDING > TRANSFER > SETTLED
] as const;

export default orderStatuses;
