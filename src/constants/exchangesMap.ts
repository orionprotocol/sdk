import exchanges from './exchanges';

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

  // DEXes
  SPOOKYSWAP: 'SpookySwap',
  PANCAKESWAP: 'PancakeSwap',
  UNISWAP: 'Uniswap',
  QUICKSWAP: 'QuickSwap',
  ORION_POOL: 'Orion Pool',
  CHERRYSWAP: 'CherrySwap',
  OKXSWAP: 'OKXSwap',
  CURVE: 'Curve',
  CURVE_FACTORY: 'Curve Factory',
} as const;

export default mapping;
