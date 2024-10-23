import { SupportedChainId } from '../types.js';

export const developmentChains = [
  SupportedChainId.BSC_TESTNET,
  SupportedChainId.ROPSTEN,
  SupportedChainId.GOERLI,
  SupportedChainId.SEPOLIA,
  SupportedChainId.ARBITRUM_GOERLI,
  SupportedChainId.FANTOM_TESTNET,
  SupportedChainId.POLYGON_TESTNET,
  SupportedChainId.OKC_TESTNET,
  SupportedChainId.EVENT_HORIZON_TESTNET,
  SupportedChainId.LUMIA_TESTNET,
  SupportedChainId.TON_TESTNET,
];
export const productionChains = [
  SupportedChainId.MAINNET,
  SupportedChainId.BSC,
  SupportedChainId.FANTOM_OPERA,
  SupportedChainId.POLYGON,
  SupportedChainId.OKC,
  SupportedChainId.ARBITRUM,
  SupportedChainId.OPBNB,
  SupportedChainId.INEVM,
  SupportedChainId.LINEA,
  SupportedChainId.AVAX,
  SupportedChainId.BASE,
  SupportedChainId.LUMIA,
  SupportedChainId.TON,
];
