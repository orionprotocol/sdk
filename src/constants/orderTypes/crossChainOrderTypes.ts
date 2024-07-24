import {ORDER_TYPE} from './orderTypes';

export const CROSS_CHAIN_ORDER_TYPES = {
    Order: ORDER_TYPE,
    CrossChainOrder: [
        {name: 'limitOrder', type: 'Order'},
        {name: 'chainId', type: 'uint24'},
        {name: 'secretHash', type: 'bytes32'},
        {name: 'lockOrderExpiration', type: 'uint64'},
    ]
}
