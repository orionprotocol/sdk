import { z } from 'zod';
import WebSocket from 'isomorphic-ws';
import { validate as uuidValidate } from 'uuid';
import { fullOrderSchema, orderUpdateSchema } from './schemas/addressUpdateSchema';
import { SupportedChainId } from '../../../constants/chains';
import MessageType from './MessageType';
import SubscriptionType from './SubscriptionType';
import {
  pingPongMessageSchema, initMessageSchema,
  errorSchema, brokerMessageSchema, orderBookSchema,
  assetPairsConfigSchema, addressUpdateSchema, swapInfoSchema,
} from './schemas';
import UnsubscriptionType from './UnsubscriptionType';
import { SwapInfo } from '../../..';
// import errorSchema from './schemas/errorSchema';

const UNSUBSCRIBE = 'u';

type SwapSubscriptionRequest = {
  d: string, // swap request UUID, set by client side
  i: string, // asset in
  o: string, // asset out
  a: number // amount in
  s?: 'SELL' | 'BUY' // force order side
}

type BrokerTradableAtomicSwapBalanceSubscription = {
  // type: SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE,
  // payload: string,
  // messageType: MessageType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATE,
  callback: (balances: {
    asset: string;
    balance: number;
  }[]) => void,
}

type PairConfigSubscription = {
  // type: SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE,
  // messageType: MessageType.ASSET_PAIRS_CONFIG_UPDATE,
  callback: (
    chainId: SupportedChainId,
    data: z.infer<typeof assetPairsConfigSchema>['u'],
  ) => void,
}

type AggregatedOrderbookSubscription = {
  // type: SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE,
  payload: string,
  // messageType: MessageType.AGGREGATED_ORDER_BOOK_UPDATE,
  callback: (
    asks: z.infer<typeof orderBookSchema>['ob']['a'],
    bids: z.infer<typeof orderBookSchema>['ob']['b'],
    pair: string
  ) => void,
}

type SwapInfoSubscription = {
  // type: SubscriptionType.SWAP_SUBSCRIBE,
  payload: SwapSubscriptionRequest,
  // messageType: MessageType.SWAP_INFO,
  callback: (swapInfo: SwapInfo) => void,
}

type AddressUpdateSubscription = {
  // type: SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE,
  payload: string,
  // messageType: MessageType.ADDRESS_UPDATE,
  callback: ({ fullOrders, orderUpdate, lockedBalances } : {
    fullOrders?: z.infer<typeof fullOrderSchema>[],
    orderUpdate?: z.infer<typeof orderUpdateSchema> | z.infer<typeof fullOrderSchema>,
    lockedBalances?: Record<string, [string, string]>,
  }) => void,
}

type Subscription = {
  [SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE]: AddressUpdateSubscription,
  [SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE]: AggregatedOrderbookSubscription,
  [SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE]: PairConfigSubscription,
  [SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE]: BrokerTradableAtomicSwapBalanceSubscription,
  [SubscriptionType.SWAP_SUBSCRIBE]: SwapInfoSubscription
}

type Subscriptions<T extends SubscriptionType> = { [K in T]: Subscription[K] }
class OrionAggregatorWS {
  private ws: WebSocket | undefined;

  private chainId: SupportedChainId;

  private subscriptions: Partial<Subscriptions<SubscriptionType>> = {};

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

  subscribe<T extends SubscriptionType>(
    type: T,
    subscription: Subscription[T],
  ) {
    this.send({
      T: type,
      ...('payload' in subscription) && {
        S: subscription.payload,
      },
    });

    this.subscriptions[type] = subscription;
  }

  unsubscribe(subscription: UnsubscriptionType | string) {
    this.send({
      T: UNSUBSCRIBE,
      S: subscription,
    });

    if (subscription.includes('-')) { // is pair name (AGGREGATED_ORDER_BOOK_UPDATE)
      delete this.subscriptions[SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE];
    } else if (subscription.includes('0x')) { // is wallet address (ADDRESS_UPDATE)
      delete this.subscriptions[SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE];
    } else if (uuidValidate(subscription)) { // is swap info subscription
      delete this.subscriptions[SubscriptionType.SWAP_SUBSCRIBE];
    } else if (subscription === UnsubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_UNSUBSCRIBE) {
      delete this.subscriptions[SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE];
    } else if (subscription === UnsubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_UNSUBSCRIBE) {
      delete this.subscriptions[SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE];
    }
  }

  init(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onclose = (e) => {
      console.log('WS agg Connection closed', e);
      this.init(url);
    };
    this.ws.onopen = () => {
      Object.entries(this.subscriptions).forEach(([type, subscription]) => {
        this.send({
          T: type,
          ...('payload' in subscription) && {
            S: subscription.payload,
          },
        });
      });
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
        swapInfoSchema,
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
        case MessageType.SWAP_INFO:
          this.subscriptions[SubscriptionType.SWAP_SUBSCRIBE]?.callback({
            swapRequestId: json.S,
            assetIn: json.ai,
            assetOut: json.ao,
            amountIn: json.a,
            amountOut: json.o,
            price: json.p,
            marketAmountOut: json.mo,
            marketPrice: json.mp,
            minAmount: json.ma,
            availableAmountIn: json.aa,
            orderInfo: {
              pair: json.oi.p,
              side: json.oi.s,
              amount: json.oi.a,
              safePrice: json.oi.sp,
            },
            path: json.ps,
            poolOptimal: json.po,
          });

          break;
        // case MessageType.INITIALIZATION:
        // break;
        case MessageType.AGGREGATED_ORDER_BOOK_UPDATE: {
          const { ob, S } = json;
          this.subscriptions[
            SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE
          ]?.callback(ob.a, ob.b, S);
        }
          break;
        case MessageType.ASSET_PAIRS_CONFIG_UPDATE: {
          const pairs = json;
          this.subscriptions[
            SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE
          ]?.callback(this.chainId, pairs.u);
        }
          break;
        case MessageType.ADDRESS_UPDATE:
          switch (json.k) { // kind
            case 'i': // initial
              this.subscriptions[
                SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE
              ]?.callback({
                fullOrders: json.o,
                lockedBalances: json.b,
              });
              break;
            case 'u': // update
              this.subscriptions[
                SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE
              ]?.callback({
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

          this.subscriptions[
            SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE
          ]?.callback(updatedBrokerBalances);
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
  OrionAggregatorWS,
  SubscriptionType,
  UnsubscriptionType,
  MessageType,
};
