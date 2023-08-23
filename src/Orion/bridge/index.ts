import { ethers } from 'ethers';
import {
  type AtomicSwap, type SupportedChainId,
  type Unit, INTERNAL_PROTOCOL_PRECISION
} from '../../index.js';
import getHistoryExt from './getHistory.js';
import swapExt from './swap.js';

import { BigNumber } from 'bignumber.js';
import generateSecret from '../../utils/generateSecret.js';

export const SECONDS_IN_DAY = 60 * 60 * 24;
export const EXPIRATION_DAYS = 4;
export default class Bridge {
  constructor(
    private readonly unitsArray: Unit[],
  ) {}

  async getMergedHistory(
    externalStoredAtomicSwaps: AtomicSwap[],
    walletAddress: string,
  ) {
    const bridgeHistory = await this.getHistory(walletAddress);

    return Object.values(bridgeHistory).map((atomicSwap) => {
      if (atomicSwap === undefined) throw new Error('No atomic swap');

      const {
        secretHash,
        amountToReceive,
        amountToSpend,
        targetChainId,
        asset,
        sourceChainId,
        sender,
        transactions,
        expiration,
        creationDate,
      } = atomicSwap;

      const localSwap = externalStoredAtomicSwaps.find(
        (swap) => secretHash === swap.secretHash,
      );

      const amount = amountToReceive ?? amountToSpend ?? 0;

      // Checking if transaction hash from blockchain is different from the same in local storage
      // and changing it to the correct one

      let assetName = asset;

      // LEGACY. Some old atomic swaps have address instead of asset name. Here we handle this case
      if (asset.includes('0x')) {
        assetName = '—'; // We don't want to display address even if we can't find asset name
      }

      return {
        localSwap,
        sourceNetwork: sourceChainId,
        targetNetwork: targetChainId,
        amount: new BigNumber(amount)
          .multipliedBy(new BigNumber(10).pow(INTERNAL_PROTOCOL_PRECISION))
          .toString(),
        walletAddress: sender,
        secretHash,
        lockTransactionHash: transactions?.lock,
        refundTransactionHash: transactions?.refund,
        asset: assetName,
        expiration:
              expiration?.lock ?? creationDate.getTime() + 60 * 60 * 24 * 4, // Or default 4 days
        creationDate: creationDate.getTime(),
        redeemOrder: atomicSwap.redeemOrder,
      };
    });
  }

  makeAtomicSwap = (
    walletAddress: string,
    networkFrom: SupportedChainId,
    networkTo: SupportedChainId,
    amount: string,
    asset: string,
    env?: string | undefined,
  ) => {
    const secret = generateSecret();
    const secretHash = ethers.utils.keccak256(secret);
    const lockExpiration = Date.now() + SECONDS_IN_DAY * EXPIRATION_DAYS * 1000;

    return {
      sourceChainId: networkFrom,
      targetChainId: networkTo,
      amount,
      walletAddress,
      secret,
      secretHash,
      assetName: asset,
      creationDate: Date.now(),
      lockExpiration,
      env,
    };
  }

  getHistory(address: string, limit = 1000) {
    return getHistoryExt(this.unitsArray, address, limit);
  }

  swap(
    assetName: string,
    amount: BigNumber.Value,
    sourceChain: SupportedChainId,
    targetChain: SupportedChainId,
    signer: ethers.Signer,
    options: {
      autoApprove?: boolean
      logger?: (message: string) => void
      withdrawToWallet?: boolean
    }
  ) {
    return swapExt({
      amount,
      assetName,
      sourceChain,
      targetChain,
      signer,
      unitsArray: this.unitsArray,
      options,
    })
  }
}
