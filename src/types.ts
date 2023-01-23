import BigNumber from 'bignumber.js';
import exchanges from './constants/exchanges';
import subOrderStatuses from './constants/subOrderStatuses';

export type AssetPairUpdate = {
    minQty: number,
    pricePrecision: number,
}
export type SubOrder = {
    pair: string,
    exchange: string,
    id: number,
    amount: number,
    settledAmount: number,
    price: number,
    status: typeof subOrderStatuses[number],
    side: 'BUY' | 'SELL',
    subOrdQty: number
}

export type Balance = {
  tradable: string,
  reserved: string,
  contract: string,
  wallet: string,
  allowance: string,
}

export type CFDBalance = {
  instrument: string,
  balance: string,
  profitLoss: string,
  fundingRate: string,
  equity: string,
  position: string,
  currentPrice: string,
  positionPrice: string,
  reserves: string,
  margin: string,
  marginUSD: string,
  freeMarginUSD: string,
  availableWithdrawBalance: string,
  maxAvailableLong: string,
  maxAvailableShort: string,
  leverage: string,
  status: PositionStatus,
}

export interface Order {
  senderAddress: string; // address
  matcherAddress: string; // address
  baseAsset: string; // address
  quoteAsset: string; // address
  matcherFeeAsset: string; // address
  amount: number; // uint64
  price: number; // uint64
  matcherFee: number; // uint64
  nonce: number; // uint64
  expiration: number; // uint64
  buySide: number; // uint8, 1=buy, 0=sell
  isPersonalSign: boolean; // bool
}

export interface CFDOrder {
  senderAddress: string; // address
  matcherAddress: string; // address
  instrumentAddress: string; // address
  amount: number; // uint64
  price: number; // uint64
  matcherFee: number; // uint64
  nonce: number; // uint64
  expiration: number; // uint64
  buySide: number; // uint8, 1=buy, 0=sell
  isPersonalSign: boolean; // bool
}

export interface SignedCFDOrder extends CFDOrder {
  id: string; // hash of Order (it's not part of order structure in smart-contract)
  signature: string; // bytes
}

export interface SignedOrder extends Order {
  id: string; // hash of Order (it's not part of order structure in smart-contract)
  signature: string; // bytes
  needWithdraw?: boolean; // bool (not supported yet by smart-contract)
}

export interface CancelOrderRequest {
  id: number | string;
  senderAddress: string;
  isPersonalSign: boolean;
}

export interface SignedCancelOrderRequest extends CancelOrderRequest {
  id: number | string;
  senderAddress: string;
  signature: string;
}

export interface Pair {
  name: string;
  baseCurrency: string;
  quoteCurrency: string;
  lastPrice: string;
  openPrice: string;
  change24h: string;
  high: string;
  low: string;
  vol24h: string;
}

export enum SupportedChainId {
  MAINNET = '1',
  ROPSTEN = '3',
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
  name: string;
  address: string;
}
export type BalanceRequirement = {
  readonly reason: string,
  readonly asset: Asset,
  readonly amount: string,
  readonly sources: Source[],
  readonly spenderAddress?: string;
}

export type AggregatedBalanceRequirement = {
  readonly asset: Asset,
  readonly sources: Source[],
  readonly spenderAddress?: string;
  items: Partial<Record<string, string>>,
}

export type ApproveFix = {
  readonly type: 'byApprove',
  readonly targetAmount: BigNumber.Value,
  readonly spenderAddress: string
}

export type DepositFix = {
  readonly type: 'byDeposit',
  readonly amount: BigNumber.Value,
  readonly asset: string
}

type Fix = ApproveFix | DepositFix;

export type BalanceIssue = {
  readonly asset: Asset,
  readonly message: string;
  readonly sources: Source[],
  readonly fixes?: Fix[],
}

export type Exchange = typeof exchanges[number];

export type OrderbookItem = {
  price: string,
  amount: string,
  exchanges: Exchange[],
  vob: {
    side: 'BUY' | 'SELL',
    pairName: string
  }[]
}

export type SwapInfoAlternative = {
  exchanges: Exchange[],
  path: string[],
  marketAmountOut?: number,
  marketAmountIn?: number,
  marketPrice: number,
  availableAmountIn?: number,
  availableAmountOut?: number,
}

export type SwapInfoBase = {
  swapRequestId: string,
  assetIn: string,
  assetOut: string,
  amountIn: number,
  amountOut: number,
  minAmountIn: number,
  minAmountOut: number,

  path: string[],
  exchanges?: Exchange[],
  poolOptimal: boolean,

  price?: number,
  marketPrice?: number,
  orderInfo?: {
    pair: string,
    side: 'BUY' | 'SELL',
    amount: number,
    safePrice: number,
  },
  alternatives: SwapInfoAlternative[],
}

export type SwapInfoByAmountIn = SwapInfoBase & {
  kind: 'exactSpend',
  availableAmountIn?: number,
  marketAmountOut?: number,
}

export type SwapInfoByAmountOut = SwapInfoBase & {
  kind: 'exactReceive',
  marketAmountIn?: number,
  availableAmountOut?: number,
}

export type SwapInfo = SwapInfoByAmountIn | SwapInfoByAmountOut;

export enum HistoryTransactionStatus {
  PENDING = 'Pending',
  DONE = 'Done',
  APPROVING = 'Approving',
  CANCELLED = 'Cancelled',
}

export type PositionStatus  = 'SHORT' | 'LONG' | 'CLOSED' | 'LIQUIDATED' | 'NOT_OPEN';
