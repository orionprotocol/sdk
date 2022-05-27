import { z } from 'zod';
import WebSocket from 'isomorphic-ws';
import { validate as uuidValidate, v4 as uuidv4 } from 'uuid';
import { fullOrderSchema, orderUpdateSchema } from './schemas/addressUpdateSchema';
import MessageType from './MessageType';
import SubscriptionType from './SubscriptionType';
import {
  pingPongMessageSchema, initMessageSchema,
  errorSchema, brokerMessageSchema, orderBookSchema,
  assetPairsConfigSchema, addressUpdateSchema, swapInfoSchema,
} from './schemas';
import UnsubscriptionType from './UnsubscriptionType';
import {
  SwapInfoByAmountIn, SwapInfoByAmountOut, SwapInfoBase,
  FullOrder, OrderUpdate, AssetPairUpdate, OrderbookItem, Balance,
} from '../../../types';
import unsubscriptionDoneSchema from './schemas/unsubscriptionDoneSchema';
// import errorSchema from './schemas/errorSchema';

const mapFullOrder = (o: z.infer<typeof fullOrderSchema>): FullOrder => ({
  kind: 'full',
  id: o.I,
  settledAmount: o.A,
  feeAsset: o.F,
  fee: o.f,
  status: o.S,
  date: o.T,
  clientOrdId: o.O,
  type: o.s,
  pair: o.P,
  amount: o.a,
  price: o.p,
  subOrders: o.c.map((so) => ({
    pair: so.P,
    exchange: so.e,
    id: so.i,
    amount: so.a,
    settledAmount: so.A,
    price: so.p,
    status: so.S,
    side: so.s,
    subOrdQty: so.A,
  })),
});

const mapOrderUpdate = (o: z.infer<typeof orderUpdateSchema>): OrderUpdate => ({
  kind: 'update',
  id: o.I,
  settledAmount: o.A,
  status: o.S,
  subOrders: o.c.map((so) => ({
    pair: so.P,
    exchange: so.e,
    id: so.i,
    amount: so.a,
    settledAmount: so.A,
    price: so.p,
    status: so.S,
    side: so.s,
    subOrdQty: so.A,
  })),
});

const UNSUBSCRIBE = 'u';

// https://github.com/orionprotocol/orion-aggregator/tree/feature/OP-1752-symmetric-swap#swap-info-subscribe
type SwapSubscriptionRequest = {
  d: string, // swap request UUID, set by client side
  i: string, // asset in
  o: string, // asset out
  a: number // amount IN/OUT
  e?: boolean; // is amount IN? Value `false` means a = amount OUT, `true` if omitted
}

type BrokerTradableAtomicSwapBalanceSubscription = {
  callback: (balances: Partial<Record<string, number>>) => void,
}

type PairConfigSubscription = {
  callback: ({ kind, data }: {
    kind: 'initial' | 'update',
    data: Partial<Record<string, AssetPairUpdate>>,
  }) => void,
}

type AggregatedOrderbookSubscription = {
  payload: string,
  callback: (
    asks: OrderbookItem[],
    bids: OrderbookItem[],
    pair: string
  ) => void,
}

type SwapInfoSubscription = {
  payload: SwapSubscriptionRequest,
  callback: (swapInfo: SwapInfoByAmountIn | SwapInfoByAmountOut) => void,
}

type AddressUpdateUpdate = {
  kind: 'update',
  balances: Partial<
      Record<
        string,
        Balance
      >
  >,
  order?: OrderUpdate | FullOrder
}

type AddressUpdateInitial = {
  kind: 'initial',
  balances: Partial<
      Record<
        string,
        Balance
      >
  >,
  orders?: FullOrder[] // The field is not defined if the user has no orders
}

type AddressUpdateSubscription = {
  payload: string,
  callback: (data: AddressUpdateUpdate | AddressUpdateInitial) => void,
}

type Subscription = {
  [SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE]: AddressUpdateSubscription,
  [SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE]: AggregatedOrderbookSubscription,
  [SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE]: PairConfigSubscription,
  [SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE]: BrokerTradableAtomicSwapBalanceSubscription,
  [SubscriptionType.SWAP_SUBSCRIBE]: SwapInfoSubscription
}
class OrionAggregatorWS {
  private ws: WebSocket | undefined;

  private subscriptions: Partial<{
    [K in keyof Subscription]: Subscription[K]
  }> = {};

  private onInit?: () => void;

  private onError?: (err: string) => void;

  private readonly wsUrl: string;

  constructor(wsUrl: string, onInit?: () => void, onError?: (err: string) => void) {
    this.wsUrl = wsUrl;
    this.onInit = onInit;
    this.onError = onError;
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

  subscribe<T extends typeof SubscriptionType[keyof typeof SubscriptionType]>(
    type: T,
    subscription: Subscription[T],
  ) {
    if (!this.ws) this.init();
    this.send({
      T: type,
      id: uuidv4(),
      ...('payload' in subscription) && {
        S: subscription.payload,
      },
    });

    this.subscriptions[type] = subscription;
  }

  unsubscribe(subscription: keyof typeof UnsubscriptionType | string) {
    this.send({
      id: uuidv4(),
      T: UNSUBSCRIBE,
      S: subscription,
    });

    if (subscription.includes('0x')) { // is wallet address (ADDRESS_UPDATE)
      delete this.subscriptions[SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE];
    } else if (uuidValidate(subscription)) { // is swap info subscription (contains hyphen)
      delete this.subscriptions[SubscriptionType.SWAP_SUBSCRIBE];
      // !!! swap info subscription is uuid that contains hyphen
    } else if (subscription.includes('-') && subscription.split('-').length === 2) { // is pair name(AGGREGATED_ORDER_BOOK_UPDATE)
      delete this.subscriptions[SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE];
    } else if (subscription === UnsubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_UNSUBSCRIBE) {
      delete this.subscriptions[SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE];
    } else if (subscription === UnsubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_UNSUBSCRIBE) {
      delete this.subscriptions[SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE];
    }
  }

  destroy() {
    this.ws?.close(4000);
    delete this.ws;
  }

  init() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onclose = (e) => {
      if (e.code !== 4000) this.init();
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
      const rawJson: unknown = JSON.parse(data.toString());

      const messageSchema = z.union([
        initMessageSchema,
        pingPongMessageSchema,
        addressUpdateSchema,
        assetPairsConfigSchema,
        brokerMessageSchema,
        orderBookSchema,
        swapInfoSchema,
        errorSchema,
        unsubscriptionDoneSchema,
      ]);

      const json = messageSchema.parse(rawJson);

      switch (json.T) {
        case MessageType.ERROR: {
          const { m: errorMessage } = errorSchema.parse(json);
          this.onError?.(errorMessage);
        }
          break;
        case MessageType.PING_PONG:
          this.sendRaw(data.toString());
          break;
        case MessageType.SWAP_INFO: {
          const baseSwapInfo: SwapInfoBase = {
            swapRequestId: json.S,
            assetIn: json.ai,
            assetOut: json.ao,
            amountIn: json.a,
            amountOut: json.o,
            price: json.p,
            marketPrice: json.mp,
            minAmounOut: json.mao,
            minAmounIn: json.ma,
            path: json.ps,
            poolOptimal: json.po,
            ...json.oi && {
              orderInfo: {
                pair: json.oi.p,
                side: json.oi.s,
                amount: json.oi.a,
                safePrice: json.oi.sp,
              },
            },
          };

          switch (json.k) { // kind
            case 'exactSpend':
              this.subscriptions[SubscriptionType.SWAP_SUBSCRIBE]?.callback({
                kind: json.k,
                marketAmountOut: json.mo,
                availableAmountIn: json.aa,
                ...baseSwapInfo,
              });

              break;
            case 'exactReceive':
              this.subscriptions[SubscriptionType.SWAP_SUBSCRIBE]?.callback({
                kind: json.k,
                ...baseSwapInfo,
                marketAmountIn: json.mi,
                availableAmountOut: json.aao,
              });
              break;
            default:
              break;
          }
        }
          break;
        case MessageType.INITIALIZATION:
          this.onInit?.();
          break;
        case MessageType.AGGREGATED_ORDER_BOOK_UPDATE: {
          const { ob, S } = json;
          const mapOrderbookItems = (rawItems: typeof ob.a | typeof ob.b) => rawItems.reduce<OrderbookItem[]>((acc, item) => {
            const [
              price,
              amount,
              exchanges,
              vob,
            ] = item;
            return [
              ...acc,
              {
                price,
                amount,
                exchanges,
                vob: vob.map(([side, pairName]) => ({
                  side,
                  pairName,
                })),
              },
            ];
          }, []);
          this.subscriptions[
            SubscriptionType.AGGREGATED_ORDER_BOOK_UPDATES_SUBSCRIBE
          ]?.callback(
            mapOrderbookItems(ob.a),
            mapOrderbookItems(ob.b),
            S,
          );
        }
          break;
        case MessageType.ASSET_PAIRS_CONFIG_UPDATE: {
          const pairs = json;
          const priceUpdates = pairs.u.reduce<Partial<Record<string, AssetPairUpdate>>>((acc, [pairName, minQty, pricePrecision]) => ({
            ...acc,
            [pairName]: {
              minQty,
              pricePrecision,
            },
          }), {});
          this.subscriptions[
            SubscriptionType.ASSET_PAIRS_CONFIG_UPDATES_SUBSCRIBE
          ]?.callback({
            kind: json.k === 'i' ? 'initial' : 'update',
            data: priceUpdates,
          });
        }
          break;
        case MessageType.ADDRESS_UPDATE: {
          const balances = json.b
            ? Object.entries(json.b)
              .reduce<Partial<Record<string, Balance>>>((prev, [asset, assetBalances]) => {
                if (!assetBalances) return prev;
                const [tradable, reserved, contract, wallet, allowance] = assetBalances;
                return {
                  ...prev,
                  [asset]: {
                    tradable, reserved, contract, wallet, allowance,
                  },
                };
              }, {})
            : {};
          switch (json.k) { // message kind
            case 'i': { // initial
              const fullOrders = json.o
                ? json.o.reduce<FullOrder[]>((prev, o) => {
                  const fullOrder = mapFullOrder(o);
                  return [
                    ...prev,
                    fullOrder,
                  ];
                }, [])
                : undefined;

              this.subscriptions[
                SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE
              ]?.callback({
                kind: 'initial',
                orders: fullOrders,
                balances,
              });
            }
              break;
            case 'u': { // update
              let orderUpdate: OrderUpdate | FullOrder | undefined;
              if (json.o) {
                const firstOrder = json.o[0];
                orderUpdate = firstOrder.k === 'full'
                  ? mapFullOrder(firstOrder)
                  : mapOrderUpdate(firstOrder);
              }

              this.subscriptions[
                SubscriptionType.ADDRESS_UPDATES_SUBSCRIBE
              ]?.callback({
                kind: 'update',
                order: orderUpdate,
                balances,
              });
            }
              break;
            default:
              break;
          }
        }
          break;
        case MessageType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATE: {
          const brokerBalances = json.bb.reduce<Partial<Record<string, number>>>((acc, [asset, balance]) => ({
            ...acc,
            [asset]: balance,
          }), {});

          this.subscriptions[
            SubscriptionType.BROKER_TRADABLE_ATOMIC_SWAP_ASSETS_BALANCE_UPDATES_SUBSCRIBE
          ]?.callback(brokerBalances);
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
