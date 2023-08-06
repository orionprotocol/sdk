import type { ethers } from 'ethers';
import {
  AtomicSwapStatus, type AtomicSwap, type SupportedChainId,
  type Unit, INTERNAL_PROTOCOL_PRECISION
} from '../../index.js';
import getHistoryExt from './getHistory.js';
import swapExt from './swap.js';

import { BigNumber } from 'bignumber.js';

const backendStatusToAtomicSwapStatus = {
  LOCKED: AtomicSwapStatus.ROUTING,
  CLAIMED: AtomicSwapStatus.SETTLED,
  REFUNDED: AtomicSwapStatus.REFUNDED,
  REDEEMED: AtomicSwapStatus.SETTLED,
  'BEFORE-REDEEM': AtomicSwapStatus.ROUTING,
} as const;

export default class Bridge {
  constructor(
    private readonly unitsArray: Unit[],
    private readonly env?: string,
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
        status: asStatus,
        claimed,
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

      // Define status
      let historyStatus = backendStatusToAtomicSwapStatus[asStatus.source];
      if (asStatus.source === 'LOCKED') {
        const historySwap = bridgeHistory[secretHash];
        if (historySwap?.status.target === 'REDEEMED') {
          historyStatus = AtomicSwapStatus.SETTLED;
        }
      }
      if (claimed) historyStatus = AtomicSwapStatus.SETTLED;
      let status: AtomicSwapStatus | undefined;
      if (
        [AtomicSwapStatus.SETTLED, AtomicSwapStatus.REFUNDED].includes(
          historyStatus,
        )
      ) {
        status = historyStatus;
      } else {
        status = localSwap !== undefined ? localSwap.status : historyStatus;
      }

      // Define secret
      const secret = localSwap !== undefined ? localSwap.secret : '';

      // Define environment
      const env = localSwap?.env;

      return {
        liquidityMigrationTxHash: localSwap?.liquidityMigrationTxHash,
        sourceNetwork: sourceChainId,
        targetNetwork: targetChainId,
        amount: new BigNumber(amount)
          .multipliedBy(new BigNumber(10).pow(INTERNAL_PROTOCOL_PRECISION))
          .toString(),
        walletAddress: sender,
        secret,
        secretHash,
        lockTransactionHash: transactions?.lock,
        refundTransactionHash: transactions?.refund,
        status,
        asset: assetName,
        expiration:
              expiration?.lock ?? creationDate.getTime() + 60 * 60 * 24 * 4, // Or default 4 days
        creationDate: creationDate.getTime(),
        env,
        redeemOrder: atomicSwap.redeemOrder,
      };
    }).filter((swap) => swap.env === undefined || swap.env === this.env);
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
