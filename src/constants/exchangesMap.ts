import type exchanges from './exchanges.js';

const mapping: Record<
    typeof exchanges[number],
    string
> = {
  // CEXes
  ASCENDEX: 'AscendEx',
  OKX: 'OKX',
  BINANCE: 'Binance',
  KUCOIN: 'KuCoin',
  ORION: 'Orion', // Internal
  INTERNAL_CEX: 'Internal',

  // DEXes
  SPOOKYSWAP: 'SpookySwap',
  PANCAKESWAP: 'PancakeSwap',
  UNISWAP: 'Uniswap',
  QUICKSWAP: 'QuickSwap',
  ORION_POOL: 'Orion Pool',
  INTERNAL_DEX: 'Orion Pool',
  CHERRYSWAP: 'CherrySwap',
  OKXSWAP: 'OKXSwap',
  CURVE: 'Curve',
  CURVE_FACTORY: 'Curve Factory',
} as const;

export default mapping;
