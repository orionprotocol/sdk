/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type factories from './constants/factories.js';
import type { BigNumber } from 'bignumber.js';
import type subOrderStatuses from './constants/subOrderStatuses.js';
import type positionStatuses from './constants/positionStatuses.js';
import type { knownEnvs } from './config/schemas/index.js';
import type getHistory from './Orion/bridge/getHistory.js';

export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type AssetPairUpdate = {
  minQty: number
  pricePrecision: number
}
export type SubOrder = {
  pair: string
  exchange: string
  id: number
  amount: number
  settledAmount: number
  price: number
  status: typeof subOrderStatuses[number]
  side: 'BUY' | 'SELL'
  subOrdQty: number
}

export type Balance = {
  tradable: string
  reserved: string
  contract: string
  wallet: string
  allowance: string
}

export type PositionStatus = typeof positionStatuses[number];

export type Order = {
  senderAddress: string // address
  matcherAddress: string // address
  baseAsset: string // address
  quoteAsset: string // address
  matcherFeeAsset: string // address
  amount: number // uint64
  price: number // uint64
  matcherFee: number // uint64
  nonce: number // uint64
  expiration: number // uint64
  buySide: 0 | 1 // uint8, 1=buy, 0=sell
}

export type SignedOrder = {
  id: string // hash of Order (it's not part of order structure in smart-contract)
  signature: string // bytes
  needWithdraw?: boolean // bool (not supported yet by smart-contract)
} & Order

export type CancelOrderRequest = {
  id: number | string
  senderAddress: string
}

export type SignedCancelOrderRequest = {
  id: number | string
  senderAddress: string
  signature: string
} & CancelOrderRequest

export type Pair = {
  name: string
  baseCurrency: string
  quoteCurrency: string
  lastPrice: string
  openPrice: string
  change24h: string
  high: string
  low: string
  vol24h: string
}

export enum SupportedChainId {
  MAINNET = '1',
  ROPSTEN = '3',
  GOERLI = '5',
  ARBITRUM_GOERLI = '421613',
  FANTOM_OPERA = '250',
  POLYGON = '137',
  OKC = '66',

  POLYGON_TESTNET = '80001',
  FANTOM_TESTNET = '4002',
  BSC = '56',
  BSC_TESTNET = '97',
  OKC_TESTNET = '65',
  DRIP_TESTNET = '56303',

  // For testing and debug purpose
  // BROKEN = '0',
}

const balanceTypes = ['exchange', 'wallet'] as const;

export type Source = typeof balanceTypes[number];
export type Asset = {
  name: string
  address: string
}
export type BalanceRequirement = {
  readonly reason: string
  readonly asset: Asset
  readonly amount: string
  readonly sources: Source[]
  readonly spenderAddress?: string | undefined
}

export type AggregatedBalanceRequirement = {
  readonly asset: Asset
  readonly sources: Source[]
  readonly spenderAddress?: string | undefined
  items: Partial<Record<string, string>>
}

export type ApproveFix = {
  readonly type: 'byApprove'
  readonly targetAmount: BigNumber.Value
  readonly spenderAddress: string
}

export type DepositFix = {
  readonly type: 'byDeposit'
  readonly amount: BigNumber.Value
  readonly asset: string
}

type Fix = ApproveFix | DepositFix;

export type BalanceIssue = {
  readonly asset: Asset
  readonly message: string
  readonly sources: Source[]
  readonly fixes?: Fix[]
}

// export type Exchange = typeof exchanges[number];

export type OrderbookItem = {
  price: string
  amount: string
  exchanges: string[]
  vob: Array<{
    side: 'BUY' | 'SELL'
    pairName: string
  }>
}

export type SwapInfoAlternative = {
  exchanges: string[]
  path: string[]
  marketAmountOut?: number | undefined
  marketAmountIn?: number | undefined
  marketPrice: number
  availableAmountIn?: number | undefined
  availableAmountOut?: number | undefined
}

export type Factory = typeof factories[number]

export type SingleSwap = {
  pool: string
  assetIn: string
  assetOut: string
  factory: Factory
}

export type SwapInfoBase = {
  swapRequestId: string
  assetIn: string
  assetOut: string
  amountIn: number
  amountOut: number
  minAmountIn: number
  minAmountOut: number

  path: string[]
  exchangeContractPath: SingleSwap[]
  exchanges?: string[] | undefined
  poolOptimal: boolean

  price?: number | undefined
  marketPrice?: number | undefined
  orderInfo?: {
    pair: string
    side: 'BUY' | 'SELL'
    amount: number
    safePrice: number
  } | undefined
  alternatives: SwapInfoAlternative[]
  assetsNameMapping?: Partial<Record<string, string>> | undefined
  usdInfo: {
    availableAmountIn: number
    availableAmountOut: number | undefined
    marketAmountOut: number
    marketAmountIn: number | undefined
    difference: string | undefined
  } | undefined
}

export type SwapInfoByAmountIn = SwapInfoBase & {
  kind: 'exactSpend'
  availableAmountIn?: number | undefined
  marketAmountOut?: number | undefined
}

export type SwapInfoByAmountOut = SwapInfoBase & {
  kind: 'exactReceive'
  marketAmountIn?: number | undefined
  availableAmountOut?: number | undefined
}

export type SwapInfo = SwapInfoByAmountIn | SwapInfoByAmountOut;

export enum HistoryTransactionStatus {
  PENDING = 'Pending',
  DONE = 'Done',
  APPROVING = 'Approving',
  CANCELLED = 'Cancelled',
}

export type BasicAuthCredentials = {
  username: string
  password: string
}

export type VerboseUnitConfig = {
  // env?: string;
  // api: string;
  chainId: SupportedChainId
  nodeJsonRpc: string
  services: {
    blockchainService: {
      http: string
      // For example:
      // http://localhost:3001/,
      // http://10.123.34.23:3001/,
      // https://blockchain:3001/
    }
    aggregator: {
      http: string
      ws: string
      // For example:
      // http://localhost:3002/,
      // http://10.34.23.5:3002/,
      // https://aggregator:3002/
    }
    priceFeed: {
      api: string
      // For example:
      // http://localhost:3003/,
      // http://10.23.5.11:3003/,
      // https://price-feed:3003/
    }
    indexer: {
      api: string
      // For example:
      // http://localhost:3004/,
      // http://
    }
  }
  basicAuth?: BasicAuthCredentials
}

export type KnownEnv = typeof knownEnvs[number];

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type EnvConfig = {
  analyticsAPI: string
  referralAPI: string
  networks: Partial<
    Record<
      SupportedChainId,
      VerboseUnitConfig
    >
  >
}
export type AggregatedAssets = Partial<
  Record<
    string,
    Partial<
      Record<SupportedChainId, {
        address: string
      }>
    >
  >
  >;

export type RedeemOrder = {
  sender: string
  receiver: string
  asset: string
  amount: number
  expiration: number
  secretHash: string
  signature: string
  claimReceiver: string
}

export interface AtomicSwapLocal {
  secret: string
  secretHash: string
  walletAddress: string
  env?: string | undefined

  sourceChainId?: SupportedChainId | undefined
  targetChainId?: SupportedChainId | undefined

  amount?: string | undefined
  assetName?: string | undefined

  liquidityMigrationTxHash?: string | undefined
  lockTransactionHash?: string | undefined
  refundTransactionHash?: string | undefined

  creationDate?: number | undefined
  lockExpiration?: number | undefined
  placingOrderError?: string | undefined
  redeemSettlement?: {
    type: 'own_tx'
  } | {
    type: 'orion_tx'
    requestedAt?: number
    result?: {
      timestamp: number
      value: 'success' | 'failed'
    }
  } | undefined
}

export enum TxStatus {
  QUEUED = 'queued',
  SIGN_FAILED = 'sign_failed',
  GAS_ESTIMATING = 'gas_estimating',
  ESTIMATE_GAS_FAILED = 'estimate_gas_failed',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
  FAILED = 'failed',
  SETTLED = 'settled',
  SIGNING = 'signing',
  UNKNOWN = 'unknown',
}

export enum TxType {
  SWAP_THROUGH_ORION_POOL = 'SWAP_THROUGH_ORION_POOL',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  BRIDGE_LOCK = 'BRIDGE_LOCK',
  BRIDGE_REDEEM = 'BRIDGE_REDEEM',
  BRIDGE_REFUND = 'BRIDGE_REFUND',
  LIQUIDITY_MIGRATION = 'LIQUIDITY_MIGRATION',
  REDEEM_TWO_ATOMICS = 'REDEEM_TWO_ATOMICS',
}

export type TxDepositOrWithdrawPayload = {
  type: TxType.DEPOSIT | TxType.WITHDRAW
  data: {
    asset: string
    amount: string
  }
};

export type TxSwapThroughOrionPoolPayload = {
  type: TxType.SWAP_THROUGH_ORION_POOL
  data: {
    side: 'buy' | 'sell'
    assetIn: string
    assetOut: string
    amount: string
    price: string
  }
};

export type TxBridgePayload = {
  type: TxType.BRIDGE_LOCK | TxType.BRIDGE_REDEEM | TxType.BRIDGE_REFUND
  data: {
    secretHash: string
  }
}

export type TxLiquidityMigrationPayload = {
  type: TxType.LIQUIDITY_MIGRATION
  data: {
    source: SupportedChainId
    target: SupportedChainId
    pair: string
    pairAddress: string
    assetA: {
      amount: string
      secretHash: string
      secret: string
    }
    assetB: {
      amount: string
      secretHash: string
      secret: string
    }
    expiration: number
    env?: string
  }
}

export type TxRedeemTwoAtomicsPayload = {
  type: TxType.REDEEM_TWO_ATOMICS
  data: {
    secretHash1: string
    secretHash2: string
  }
}

export type TransactionInfo = {
  id?: string
  status?: TxStatus
  hash?: string
  payload?: TxDepositOrWithdrawPayload
  | TxSwapThroughOrionPoolPayload
  | TxBridgePayload
  | TxLiquidityMigrationPayload
  | TxRedeemTwoAtomicsPayload
}

type BridgeHistory = Awaited<ReturnType<typeof getHistory>>;

type BridgeHistoryItem = NonNullable<BridgeHistory[string]>;

export type AtomicSwap = Partial<
  Omit<BridgeHistoryItem, 'creationDate' | 'expiration' | 'secret'>
> & Partial<
  Omit<AtomicSwapLocal, 'creationDate' | 'expiration' | 'secret'>
> & {
  sourceChainId: SupportedChainId
  targetChainId: SupportedChainId
  lockExpiration: number
  secretHash: string
  walletAddress: string
  secret?: string | undefined

  creationDate?: number | undefined
  redeemExpired?: boolean | undefined

  lockTx?: TransactionInfo | undefined
  redeemTx?: TransactionInfo | undefined
  refundTx?: TransactionInfo | undefined
  liquidityMigrationTx?: TransactionInfo | undefined
}
