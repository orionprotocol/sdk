import subOrderStatuses from './subOrderStatuses.js';

const orderStatuses = [
  ...subOrderStatuses,
  'ROUTING', // order got sub orders, but not all of them have status ACCEPTED
] as const;

export default orderStatuses;
