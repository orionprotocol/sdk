import { ethers } from 'ethers';
import type OrionUnit from '../OrionUnit';
import simpleFetch from '../simpleFetch';
import type { SupportedChainId } from '../types';
import { isValidChainId } from '../utils';

const getBridgeHistory = async (units: OrionUnit[], address: string, limit = 1000) => {
  if (!ethers.utils.isAddress(address)) throw new Error(`Invalid address: ${address}`);
  const data = await Promise.all(units.map(async ({ orionBlockchain, orionAggregator, chainId }) => {
    const sourceNetworkHistory = await simpleFetch(orionBlockchain.getSourceAtomicSwapHistory)({
      limit,
      sender: address,
    });
    const targetNetworkHistory = await simpleFetch(orionBlockchain.getTargetAtomicSwapHistory)({
      limit,
      receiver: address,
    });
    const orionAggregatorHistoryAtomicSwaps = await simpleFetch(orionAggregator.getHistoryAtomicSwaps)(
      address,
      limit
    );

      type SourceNetworkHistoryItem = Omit<
        typeof sourceNetworkHistory.data[number],
        'secretHash'
      > & {
        sourceChainId: SupportedChainId
      };
      const sourceNetworkHistoryObj = sourceNetworkHistory.data.reduce<
        Partial<Record<string, SourceNetworkHistoryItem>>
        >((acc, cur) => {
          const { secretHash } = cur;
          const lowercaseSecretHash = secretHash.toLowerCase();

          acc[lowercaseSecretHash] = {
            ...cur,
            sourceChainId: chainId,
          }
          return acc;
        }, {});

      type TargetNetworkHistoryItem = Omit<
        typeof targetNetworkHistory.data[number],
        'secretHash'
      > & {
        targetChainId: SupportedChainId
      };

      const targetNetworkHistoryObj = targetNetworkHistory.data.reduce<
        Partial<Record<string, TargetNetworkHistoryItem>>
        >((acc, cur) => {
          const { secretHash } = cur;
          const lowercaseSecretHash = secretHash.toLowerCase();

          acc[lowercaseSecretHash] = {
            ...cur,
            targetChainId: chainId,
          }
          return acc;
        }, {});

      type OrionAggregatorHistoryAtomicSwapsItem = typeof orionAggregatorHistoryAtomicSwaps[number] & {
        chainId: SupportedChainId
      }

      const orionAggregatorHistoryAtomicSwapsObj = orionAggregatorHistoryAtomicSwaps.reduce<
        Partial<Record<string, OrionAggregatorHistoryAtomicSwapsItem>>
        >((acc, cur) => {
          const { secretHash } = cur.lockOrder;
          const lowercaseSecretHash = secretHash.toLowerCase();
          acc[lowercaseSecretHash] = {
            ...cur,
            chainId,
          }
          return acc;
        }, {});

      return {
        sourceNetworkHistory: sourceNetworkHistoryObj,
        targetNetworkHistory: targetNetworkHistoryObj,
        network: chainId,
        orionAggregatorHistoryAtomicSwaps: orionAggregatorHistoryAtomicSwapsObj
      };
  }));

    type SourceItems = typeof data[number]['sourceNetworkHistory'];

    const unitedSourceItems = data.reduce<SourceItems>((acc, cur) => {
      const { sourceNetworkHistory } = cur;
      return {
        ...acc,
        ...sourceNetworkHistory,
      }
    }, {});

    type TargetItems = typeof data[number]['targetNetworkHistory'];

    const unitedTargetItems = data.reduce<TargetItems>((acc, cur) => {
      const { targetNetworkHistory } = cur;
      return {
        ...acc,
        ...targetNetworkHistory,
      }
    }, {});

    type AggItems = typeof data[number]['orionAggregatorHistoryAtomicSwaps'];

    const unitedAggregatorHistory = data.reduce<AggItems>((acc, cur) => {
      const { orionAggregatorHistoryAtomicSwaps } = cur;
      return {
        ...acc,
        ...orionAggregatorHistoryAtomicSwaps,
      }
    }, {});

    // Aggregate data
    const aggregatedData = Object.entries(unitedSourceItems).map(([secretHash, item]) => {
      if (item === undefined) throw new Error(`Item is undefined for secretHash: ${secretHash}`);

      const targetItem = unitedTargetItems[secretHash];
      // if (targetItem === undefined) {
      //   console.error(`Target item is undefined for secretHash: ${secretHash}`);
      // }

      const aggItem = unitedAggregatorHistory[secretHash];
      // if (aggItem === undefined) {
      //   console.error(`Aggregator item is undefined for secretHash: ${secretHash}`);
      // }

      const targetChainIdFromSource = item.targetChainId.toString();
      if (!isValidChainId(targetChainIdFromSource)) {
        throw new Error(`Invalid targetChainId: ${targetChainIdFromSource}`);
      }
      return {
        sourceChainId: item.sourceChainId,
        targetChainId: targetItem?.targetChainId ?? targetChainIdFromSource,
        // Shared data
        used: item.used,
        claimed: item.claimed,
        isAggApplied: item.isAggApplied,
        asset: item.asset,
        sender: item.sender,
        secretHash,
        receiver: item.receiver ?? targetItem?.receiver,
        secret: item.secret ?? targetItem?.secret,

        // Combined data
        timestamp: {
          ...item.timestamp,
          ...targetItem?.timestamp,
        },
        expiration: {
          ...item.expiration,
          ...targetItem?.expiration,
        },
        transactions: {
          ...item.transactions,
          ...targetItem?.transactions,
        },
        amountToReceive: item.amountToReceive,
        amountToSpend: item.amountToSpend,
        status: {
          source: item.state,
          target: targetItem?.state,
          aggregator: aggItem?.status,
        },
        lockOrder: aggItem?.lockOrder,
        redeemOrder: aggItem?.redeemOrder,
      }
    });

    return aggregatedData;
}

export default getBridgeHistory;
