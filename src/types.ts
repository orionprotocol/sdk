/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type BigNumber from 'bignumber.js';
import type exchanges from './constants/exchanges';
import type subOrderStatuses from './constants/subOrderStatuses';
import type positionStatuses from './constants/positionStatuses';
import type { knownEnvs } from './config/schemas';

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

export type CFDBalance = {
  instrument: string
  balance: string
  profitLoss: string
  fundingRate: string
  equity: string
  position: string
  currentPrice: string
  positionPrice: string
  reserves: string
  margin: string
  marginUSD: string
  freeMarginUSD: string
  availableWithdrawBalance: string
  leverage: string
  status: PositionStatus
  longFundingRatePerSecond: string
  longFundingRatePerDay: string
  shortFundingRatePerSecond: string
  shortFundingRatePerDay: string
  stopOutPrice: string | undefined
}

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
  isPersonalSign: boolean // bool
}

export type CFDOrder = {
  senderAddress: string // address
  matcherAddress: string // address
  instrumentAddress: string // address
  amount: number // uint64
  price: number // uint64
  matcherFee: number // uint64
  nonce: number // uint64
  expiration: number // uint64
  buySide: 0 | 1 // uint8, 1=buy, 0=sell
  stopPrice?: number | undefined // uint64
  isPersonalSign: boolean // bool
}

export type SignedCFDOrder = {
  id: string // hash of Order (it's not part of order structure in smart-contract)
  signature: string // bytes
} & CFDOrder

export type SignedOrder = {
  id: string // hash of Order (it's not part of order structure in smart-contract)
  signature: string // bytes
  needWithdraw?: boolean // bool (not supported yet by smart-contract)
} & Order

export type CancelOrderRequest = {
  id: number | string
  senderAddress: string
  isPersonalSign: boolean
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
  FANTOM_OPERA = '250',
  POLYGON = '137',
  OKC = '66',

  POLYGON_TESTNET = '80001',
  FANTOM_TESTNET = '4002',
  BSC = '56',
  BSC_TESTNET = '97',
  OKC_TESTNET = '65',

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

export type Exchange = typeof exchanges[number];

export type OrderbookItem = {
  price: string
  amount: string
  exchanges: Exchange[]
  vob: Array<{
    side: 'BUY' | 'SELL'
    pairName: string
  }>
}

export type SwapInfoAlternative = {
  exchanges: Exchange[]
  path: string[]
  marketAmountOut?: number | undefined
  marketAmountIn?: number | undefined
  marketPrice: number
  availableAmountIn?: number | undefined
  availableAmountOut?: number | undefined
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
  exchanges?: Exchange[] | undefined
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

export type FuturesTradeInfo = {
  futuresTradeRequestId: string
  sender: string
  instrument: string
  buyPrice: number | null
  sellPrice: number | null
  buyPower: number
  sellPower: number
  minAmount: number
}

export enum HistoryTransactionStatus {
  PENDING = 'Pending',
  DONE = 'Done',
  APPROVING = 'Approving',
  CANCELLED = 'Cancelled',
}

export type VerboseOrionUnitConfig = {
  // env?: string;
  // api: string;
  chainId: SupportedChainId
  nodeJsonRpc: string
  services: {
    orionBlockchain: {
      http: string
      // For example:
      // http://localhost:3001/,
      // http://10.123.34.23:3001/,
      // https://blockchain.orionprotocol.io/
    }
    orionAggregator: {
      http: string
      ws: string
      // For example:
      // http://localhost:3002/,
      // http://10.34.23.5:3002/,
      // shttps://aggregator.orionprotocol.io/
    }
    priceFeed: {
      api: string
      // For example:
      // http://localhost:3003/,
      // http://10.23.5.11:3003/,
      // https://price-feed.orionprotocol.io/
    }
  }
}

export type KnownEnv = typeof knownEnvs[number];

export type AnyJSON = string | number | boolean | null | JSONObject | JSONArray;

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
interface JSONObject {
  [x: string]: AnyJSON
}

interface JSONArray extends Array<AnyJSON> {}
