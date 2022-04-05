export enum SupportedChainId {
  MAINNET = '0x1',
  ROPSTEN = '0x3',
  FANTOM_OPERA = '0xfa',

  FANTOM_TESTNET = '0xfa2',
  BSC = '0x38',
  BSC_TESTNET = '0x61',

  // For testing and debug purpose
  BROKEN = '0x0',
}

export const developmentChains = [SupportedChainId.BSC_TESTNET, SupportedChainId.ROPSTEN, SupportedChainId.FANTOM_TESTNET];
export const productionChains = [SupportedChainId.MAINNET, SupportedChainId.BSC, SupportedChainId.FANTOM_OPERA];
