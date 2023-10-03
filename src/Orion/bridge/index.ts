import { ethers } from 'ethers';
import type {
  Unit, AtomicSwapLocal, SupportedChainId, TransactionInfo, AtomicSwap, RedeemOrder
} from '../../index.js';
import { INTERNAL_PROTOCOL_PRECISION, TxStatus, TxType } from '../../index.js';
import getHistory from './getHistory.js';
import swapExt from './swap.js';

import { BigNumber } from 'bignumber.js';
import generateSecret from '../../utils/generateSecret.js';
import { isPresent } from 'ts-is-present';
import { invariant } from '../../utils/invariant.js';
import { simpleFetch } from 'simple-typed-fetch';

export const SECONDS_IN_DAY = 60 * 60 * 24;
export const EXPIRATION_DAYS = 4;

type ExternalAtomicsData = Awaited<ReturnType<typeof getHistory>>;
export default class Bridge {
  readonly EXTERNAL_ATOMICS_DATA_CACHE_TIME_MS = 5 * 1000; // 5 seconds
  private externalAtomicSwaps: Partial<Record<string, { // wallet address -> data
    lastUpdate: number
    data: ExternalAtomicsData
  }>> = {};

  readonly ADDRESS_TO_ASSET_CACHE_TIME_MS = 5 * 60 * 1000; // 5 minutes
  private addressToAsset: {
    lastUpdate: number
    data: Partial<Record<string, Partial<Record<SupportedChainId, string>>>>
  } = { lastUpdate: 0, data: {} };

  constructor(
    private readonly unitsArray: Unit[],
  ) {}

  registerRedeemOrder(
    secretHash: string,
    redeemOrder: RedeemOrder,
  ) {
    const senderCached = this.externalAtomicSwaps[redeemOrder.sender];
    const receiverCached = this.externalAtomicSwaps[redeemOrder.receiver];
    if (senderCached !== undefined) {
      const atomic = senderCached.data[secretHash];
      if (atomic !== undefined) {
        atomic.redeemOrder = redeemOrder;
      }
    }
    if (receiverCached !== undefined) {
      const atomic = receiverCached.data[secretHash];
      if (atomic !== undefined) {
        atomic.redeemOrder = redeemOrder;
      }
    }
  }

  async getCombinedAddressToAsset() {
    const { lastUpdate, data } = this.addressToAsset;
    const cacheIsExpired = lastUpdate + this.EXTERNAL_ATOMICS_DATA_CACHE_TIME_MS < Date.now();
    if (!cacheIsExpired) return data;
    const addressToAssetData: Partial<Record<string, Partial<Record<SupportedChainId, string>>>> = {};
    await Promise.all(this.unitsArray.map(async (unit) => {
      const { blockchainService, chainId } = unit;
      const { assetToAddress } = await simpleFetch(blockchainService.getInfo)();
      Object.entries(assetToAddress).forEach(([asset, address]) => {
        if (address !== undefined) {
          const assetRecord = addressToAssetData[address];
          if (assetRecord !== undefined) {
            assetRecord[chainId] = asset;
          } else {
            addressToAssetData[address] = {
              [chainId]: asset,
            };
          }
        }
      });
    }));
    this.addressToAsset = {
      lastUpdate: Date.now(),
      data: addressToAssetData,
    }
    return addressToAssetData;
  }

  async combineLocalAndExternalData(
    walletAddress: string,
    localAtomicSwaps: AtomicSwapLocal[],
    transactions: TransactionInfo[],
  ) {
    // Prepare transactions data
    const byTxHashMap = new Map<string, TransactionInfo>();
    type BridgeTxs = {
      lockTx?: TransactionInfo | undefined
      redeemTx?: TransactionInfo | undefined
      refundTx?: TransactionInfo | undefined
    };
    const bySecretHashMap = new Map<string, BridgeTxs>();
    transactions.forEach((tx) => {
      if (tx.hash !== undefined) byTxHashMap.set(tx.hash, tx);
      if (tx.payload) {
        const { type, data } = tx.payload;
        if (type === TxType.BRIDGE_LOCK || type === TxType.BRIDGE_REDEEM || type === TxType.BRIDGE_REFUND) {
          const item = bySecretHashMap.get(data.secretHash);
          bySecretHashMap.set(data.secretHash, {
            ...item,
            lockTx: type === TxType.BRIDGE_LOCK ? tx : item?.lockTx,
            redeemTx: type === TxType.BRIDGE_REDEEM ? tx : item?.redeemTx,
            refundTx: type === TxType.BRIDGE_REFUND ? tx : item?.refundTx,
          });
        }
      }
    });

    // Combine local data and external data
    const bridgeHistory = await this.getHistory(walletAddress);
    const combinedAddressToAsset = await this.getCombinedAddressToAsset();
    const atomicSwapsMap = new Map<string, AtomicSwap>();
    Object.values(bridgeHistory)
      .filter(isPresent)
      .forEach((atomicHistoryItem) => {
        const { lock, redeem, refund } = atomicHistoryItem.transactions ?? {};
        const lockTx = lock !== undefined
          ? {
            hash: lock,
            status: TxStatus.SETTLED,
          }
          : undefined;
        const redeemTx = redeem !== undefined
          ? {
            hash: redeem,
            status: TxStatus.SETTLED,
          }
          : undefined;
        const refundTx = refund !== undefined
          ? {
            hash: refund,
            status: TxStatus.SETTLED,
          }
          : undefined;

        let redeemExpired = false;

        // If redeem order is expired
        if (atomicHistoryItem.redeemOrder) {
          const currentTime = Date.now();
          if (currentTime > atomicHistoryItem.redeemOrder.expiration) redeemExpired = true;
        }

        const assetName = combinedAddressToAsset[atomicHistoryItem.asset]?.[atomicHistoryItem.sourceChainId];

        const amount = atomicHistoryItem.amountToReceive ?? atomicHistoryItem.amountToSpend;

        invariant(atomicHistoryItem.expiration?.lock, 'Lock expiration must be defined');
        atomicSwapsMap.set(atomicHistoryItem.secretHash, {
          ...atomicHistoryItem,
          walletAddress: atomicHistoryItem.sender,
          creationDate: atomicHistoryItem.creationDate.getTime(),
          assetName,
          lockTx,
          amount: amount !== undefined ? amount.toString() : undefined,
          redeemTx,
          refundTx,
          lockExpiration: atomicHistoryItem.expiration.lock,
          redeemExpired,
        });
      });
    localAtomicSwaps.forEach((atomic) => {
      const atomicInMap = atomicSwapsMap.get(atomic.secretHash);

      const { liquidityMigrationTxHash, redeemSettlement, secretHash } = atomic;

      const secretHashTxs = bySecretHashMap.get(secretHash);
      let redeemTx: TransactionInfo | undefined;
      if (redeemSettlement) {
        if (redeemSettlement.type === 'own_tx') {
          redeemTx = secretHashTxs?.redeemTx;
        } else if (redeemSettlement.result) {
          redeemTx = {
            status: redeemSettlement.result.value === 'success' ? TxStatus.SETTLED : TxStatus.FAILED,
          }
        } else if (redeemSettlement.requestedAt !== undefined) {
          redeemTx = {
            status: TxStatus.PENDING,
          }
        }
      }
      const liquidityMigrationTx = liquidityMigrationTxHash !== undefined ? byTxHashMap.get(liquidityMigrationTxHash) : undefined;
      const amount = atomic.amount !== undefined
        ? new BigNumber(atomic.amount).div(10 ** INTERNAL_PROTOCOL_PRECISION).toString()
        : undefined;
      if (atomicInMap) { // Merge local and backend data
        atomicSwapsMap.set(atomic.secretHash, {
          ...atomicInMap,
          ...atomic,
          lockExpiration: atomicInMap.lockExpiration,
          targetChainId: atomicInMap.targetChainId,
          sourceChainId: atomicInMap.sourceChainId,
          amount: atomicInMap.amount ?? amount,
          lockTx: atomicInMap.lockTx ?? secretHashTxs?.lockTx,
          redeemTx: atomicInMap.redeemTx ?? redeemTx,
          refundTx: atomicInMap.refundTx ?? secretHashTxs?.refundTx,
          liquidityMigrationTx: atomicInMap.liquidityMigrationTx ?? liquidityMigrationTx,
        });
      } else {
        invariant(atomic.targetChainId, 'Target chain id is not defined');
        invariant(atomic.sourceChainId, 'Source chain id is not defined');
        invariant(atomic.lockExpiration, 'Lock expiration is not defined');

        atomicSwapsMap.set(atomic.secretHash, {
          ...atomic,
          sourceChainId: atomic.sourceChainId,
          targetChainId: atomic.targetChainId,
          lockExpiration: atomic.lockExpiration,
          lockTx: secretHashTxs?.lockTx,
          redeemTx,
          refundTx: secretHashTxs?.refundTx,
          liquidityMigrationTx,
        });
      }
    });
    return atomicSwapsMap;
  }

  makeAtomicSwap(
    walletAddress: string,
    networkFrom: SupportedChainId,
    networkTo: SupportedChainId,
    amount: string,
    asset: string,
    env?: string | undefined,
  ) {
    const secret = generateSecret();
    const secretHash = ethers.keccak256(secret);
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

  async getHistory(address: string, limit = 1000) {
    const cachedData = this.externalAtomicSwaps[address];
    let data: ExternalAtomicsData | undefined;
    if (cachedData !== undefined) {
      const cacheIsExpired = cachedData.lastUpdate + this.EXTERNAL_ATOMICS_DATA_CACHE_TIME_MS < Date.now();
      if (!cacheIsExpired) data = cachedData.data;
    }

    if (data === undefined) {
      data = await getHistory(this.unitsArray, address, limit);
      this.externalAtomicSwaps[address] = {
        lastUpdate: Date.now(),
        data,
      };
    }
    return data;
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
