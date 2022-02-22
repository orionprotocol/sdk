export const DEPOSIT_ETH_GAS_LIMIT = 70000;
export const DEPOSIT_ERC20_GAS_LIMIT = 150000;
export const WITHDRAW_GAS_LIMIT = DEPOSIT_ERC20_GAS_LIMIT;
export const APPROVE_ERC20_GAS_LIMIT = 70000;
export const STAKE_ERC20_GAS_LIMIT = 150000;
export const VOTE_ERC20_GAS_LIMIT = 150000;
export const FILL_ORDERS_GAS_LIMIT = 220000;
export const SWAP_THROUGH_ORION_POOL_GAS_LIMIT = 600000;
export const ADD_LIQUIDITY_GAS_LIMIT = 600000;
export const FARMING_STAKE_GAS_LIMIT = 350000;
export const FARMING_CLAIM_GAS_LIMIT = 350000;
export const FARMING_EXIT_GAS_LIMIT = 500000;
export const FARMING_WITHDRAW_GAS_LIMIT = 350000;
export const GOVERNANCE_GET_REWARD_GAS_LIMIT = 250000;
export const GOVERNANCE_STAKE_GAS_LIMIT = 300000;
export const GOVERNANCE_UNSTAKE_GAS_LIMIT = 250000;
export const GOVERNANCE_VOTE_GAS_LIMIT = 200000;
export const MIGRATE_GAS_LIMIT = 800000;
export const LOCKATOMIC_GAS_LIMIT = 200000;
export const REDEEMATOMIC_GAS_LIMIT = 200000;

export const DEFAULT_GAS_LIMIT = 700000;

export const TOKEN_EXCEPTIONS: Record<string, Record<string, number>> = {
  CUMMIES: {
    deposit: 300000,
    withdraw: 300000,
  },
};
