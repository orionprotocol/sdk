export enum SupportedChainId {
  MAINNET = '0x1',
  ROPSTEN = '0x3',

  FANTOM_TESTNET = '0xfa2',
  BSC = '0x38',
  BSC_TESTNET = '0x61',
}

export const developmentChains = [SupportedChainId.BSC_TESTNET, SupportedChainId.ROPSTEN, SupportedChainId.FANTOM_TESTNET];
export const productionChains = [SupportedChainId.MAINNET, SupportedChainId.BSC];
