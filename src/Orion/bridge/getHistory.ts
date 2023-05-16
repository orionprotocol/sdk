import { ethers } from 'ethers';
import type Unit from '../../Unit/index.js';
import type { SupportedChainId } from '../../types.js';
import { isValidChainId } from '../../utils/index.js';
import { simpleFetch } from 'simple-typed-fetch';
import bsonObjectId from 'bson-objectid';

const ObjectID = bsonObjectId.default

const getHistory = async (units: Unit[], address: string, limit = 1000) => {
  if (!ethers.utils.isAddress(address)) throw new Error(`Invalid address: ${address}`);
  const data = await Promise.all(units.map(async ({ blockchainService, aggregator, chainId }) => {
    const sourceNetworkHistory = await simpleFetch(blockchainService.getSourceAtomicSwapHistory)({
      limit,
      sender: address,
    });
    const targetNetworkHistory = await simpleFetch(blockchainService.getTargetAtomicSwapHistory)({
      limit,
      receiver: address,
    });
    const aggregatorHistoryAtomicSwaps = await simpleFetch(aggregator.getHistoryAtomicSwaps)(
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

      type AggregatorHistoryAtomicSwapsItem = typeof aggregatorHistoryAtomicSwaps[number] & {
        chainId: SupportedChainId
      }

      const aggregatorHistoryAtomicSwapsObj = aggregatorHistoryAtomicSwaps.reduce<
        Partial<Record<string, AggregatorHistoryAtomicSwapsItem>>
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
        aggregatorHistoryAtomicSwaps: aggregatorHistoryAtomicSwapsObj
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

    type AggItems = typeof data[number]['aggregatorHistoryAtomicSwaps'];

    const unitedAggregatorHistory = data.reduce<AggItems>((acc, cur) => {
      const { aggregatorHistoryAtomicSwaps } = cur;
      return {
        ...acc,
        ...aggregatorHistoryAtomicSwaps,
      }
    }, {});

    type TargetItem = NonNullable<TargetItems[string]>;
    type SourceItem = NonNullable<SourceItems[string]>;
    type AggItem = NonNullable<AggItems[string]>;

    type AggregatedItem = {
      creationDate: Date
      sourceChainId: SupportedChainId
      targetChainId: SupportedChainId
      used: boolean
      claimed: boolean
      isAggApplied: boolean
      asset: string
      sender: string
      secretHash: string
      receiver: string | undefined
      secret: string | undefined
      timestamp: TargetItem['timestamp'] & SourceItem['timestamp']
      expiration: TargetItem['expiration'] & SourceItem['expiration']
      transactions: TargetItem['transactions'] & SourceItem['transactions']
      lockOrder: AggItem['lockOrder'] | undefined
      redeemOrder: AggItem['redeemOrder'] | undefined
      amountToReceive: SourceItem['amountToReceive']
      amountToSpend: SourceItem['amountToSpend']
      status: {
        source: SourceItem['state']
        target: TargetItem['state'] | undefined
        aggregator: AggItem['status'] | undefined
      }
    }

    // Aggregate data
    const aggregatedData = Object.entries(unitedSourceItems).reduce<
        Partial<Record<string, AggregatedItem>>
    >((acc, [secretHash, item]) => {
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

      const creationDate = ObjectID(item._id).getTimestamp();
      const dataItem = {
        creationDate,
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
      acc[secretHash] = dataItem;
      return acc;
    }, {});
    return aggregatedData;
}

export default getHistory;
