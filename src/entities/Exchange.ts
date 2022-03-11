import { Provider } from '@ethersproject/providers';
import { Signer } from 'ethers';
import { SupportedChainId } from '../constants';

export default class Exchange {
  private chainId: SupportedChainId;

  private signerOrProvider: Signer | Provider;

  constructor(chainId: SupportedChainId, signerOrProvider: Signer | Provider) {
    this.chainId = chainId;
    this.signerOrProvider = signerOrProvider;
  }
}
