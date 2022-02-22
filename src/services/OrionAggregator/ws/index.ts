import { z } from 'zod';
import WebSocket from 'isomorphic-ws';
import { fullOrderSchema, orderUpdateSchema } from './schemas/addressUpdateSchema';
import { SupportedChainId } from '../../../constants/chains';
import MessageType from './MessageType';
import SubscriptionType from './SubscriptionType';
import {
  pingPongMessageSchema, initMessageSchema,
  errorSchema, brokerMessageSchema, orderBookSchema,
  assetPairsConfigSchema, addressUpdateSchema,
} from './schemas';
import UnsubscriptionType from './UnsubscriptionType';

// import errorSchema from './schemas/errorSchema';

const UNSUBSCRIBE = 'u';

type SubscriptionCallback = {
  [SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE]: (
    asks: z.infer<typeof orderBookSchema>['ob']['a'],
    bids: z.infer<typeof orderBookSchema>['ob']['b'],
    pair: string
  ) => void,
  [SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE]:
  (
    chainId: SupportedChainId,
    data: z.infer<typeof assetPairsConfigSchema>['u'],
  ) => void,
  [SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE]: ({ fullOrders, orderUpdate, lockedBalances } : {
    fullOrders?: z.infer<typeof fullOrderSchema>[],
    orderUpdate?: z.infer<typeof orderUpdateSchema> | z.infer<typeof fullOrderSchema>,
    lockedBalances?: Record<string, [string, string]>,
  }) => void,
  [SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE]: (balances: {
    asset: string;
    balance: number;
  }[]) => void,
}

const subscriptionToMesage: Record<SubscriptionType, MessageType> = {
  [SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE]: MessageType.ADDRESS_UPDATE,
  [SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE]: MessageType.AGGREGATED_ORDER_BOOK_UPDATE,
  [SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE]: MessageType.ASSET_PAIRS_CONFIG_UPDATE,
  // eslint-disable-next-line max-len
  [SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE]: MessageType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATE,
};

type Subscription<T extends SubscriptionType> = {
  type: T,
  callback?: SubscriptionCallback[T],
}
class OrionAggregatorWS {
  private ws: WebSocket | undefined;

  private chainId: SupportedChainId;

  private subscriptions: Subscription<SubscriptionType>[] = [];

  private subscriptionCallbacks: Partial<SubscriptionCallback> = {};

  constructor(url: string, chainId: SupportedChainId) {
    this.chainId = chainId;
    this.init(url);
  }

  sendRaw(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.ws?.readyState === 1) {
      this.ws.send(data);
    } else if (this.ws?.readyState === 0) {
      setTimeout(() => {
        this.sendRaw(data);
      }, 50);
    }
  }

  send(data: unknown) {
    if (this.ws?.readyState === 1) {
      this.ws.send(JSON.stringify(data));
    } else {
      setTimeout(() => {
        this.send(data);
      }, 50);
    }
  }

  // destroy() {
  //   if (this.ws) this.ws.close(3000, 'USER_CHANGED_NETWORK');
  // }

  subscribe<T extends SubscriptionType>(
    type: T,
    subscription?: string,
    callback?: SubscriptionCallback[T],
  ) {
    this.send({
      T: type,
      S: subscription,
    });

    this.subscriptions.push({
      type,
      callback,
    });

    this.subscriptionCallbacks[type] = callback;
  }

  unsubscribe(subscription: UnsubscriptionType | string) {
    this.send({
      T: UNSUBSCRIBE,
      S: subscription,
    });

    if (subscription.includes('-')) { // is pair name (AGGREGATED_ORDER_BOOK_UPDATE)
      delete this.subscriptionCallbacks[SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE];
    } else if (subscription.includes('0x')) { // is wallet address (ADDRESS_UPDATE)
      delete this.subscriptionCallbacks[SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE];
    } else if (subscription === UnsubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_UNSUBSCRIBE) {
      delete this.subscriptionCallbacks[SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE];
    } else if (subscription === UnsubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_UNSUBSCRIBE) {
      delete this.subscriptionCallbacks[SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE];
    }
  }

  init(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onclose = (e) => {
      console.log('WS agg Connection closed', e);
      this.init(url);
    };
    this.ws.onmessage = (e) => {
      const { data } = e;
      const rawJson = JSON.parse(data.toString());

      const messageSchema = z.union([
        initMessageSchema,
        pingPongMessageSchema,
        addressUpdateSchema,
        assetPairsConfigSchema,
        brokerMessageSchema,
        orderBookSchema,
        errorSchema,
      ]);

      const json = messageSchema.parse(rawJson);

      switch (json.T) {
        case MessageType.ERROR:
          // const { m: errorMessage } = errorSchema.parse(json);
          break;
        case MessageType.PING_PONG:
          this.sendRaw(data.toString());
          break;
        // case MessageType.INITIALIZATION:
        // break;
        case MessageType.AGGREGATED_ORDER_BOOK_UPDATE: {
          const { ob, S } = json;
          this.subscriptionCallbacks[SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE]?.(ob.a, ob.b, S);
        }
          break;
        case MessageType.ASSET_PAIRS_CONFIG_UPDATE: {
          const pairs = json;
          this.subscriptionCallbacks[SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE]?.(this.chainId, pairs.u);
        }
          break;
        case MessageType.ADDRESS_UPDATE:
          switch (json.k) {
            case 'i':
              this.subscriptionCallbacks[SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE]?.({
                fullOrders: json.o,
                lockedBalances: json.b,
              });
              break;
            case 'u':
              this.subscriptionCallbacks[SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE]?.({
                orderUpdate: json.o?.[0],
                lockedBalances: json.b,
              });
              break;
            default:
              break;
          }
          break;
        case MessageType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATE: {
          const updatedBrokerBalances = json.bb.map((bb) => {
            const [asset, balance] = bb;
            return { asset, balance };
          });

          this.subscriptionCallbacks[
            SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE
          ]?.(updatedBrokerBalances);
        }
          break;
        default:
          break;
      }
    };
  }
}

export * as schemas from './schemas';
export {
  OrionAggregatorWS, SubscriptionType, UnsubscriptionType, MessageType,
};
