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

type SwapInfoBase = {
  swapRequestId: string,
  assetIn: string,
  assetOut: string,
  amountIn: number,
  amountOut: number,
  minAmounIn: number,
  minAmounOut: number,

  path: string[],
  poolOptimal: boolean,

  price?: number,
  marketPrice?: number,
  orderInfo?: {
    pair: string,
    side: 'BUY' | 'SELL',
    amount: number,
    safePrice: number,
  }
}

export type SwapInfoByAmountIn = SwapInfoBase & {
  kind: 'byAmountIn',
  availableAmountIn?: number,
  marketAmountOut?: number,
}

export type SwapInfoByAmountOut = SwapInfoBase & {
  kind: 'byAmountOut',
  marketAmountIn?: number,
  availableAmountOut?: number,
}

export type SwapInfo = SwapInfoByAmountIn | SwapInfoByAmountOut;
