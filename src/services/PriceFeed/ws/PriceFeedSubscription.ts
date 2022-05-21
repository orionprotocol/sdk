import WebSocket from 'isomorphic-ws';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import priceFeedSubscriptions from './priceFeedSubscriptions';
import { tickerInfoSchema } from './schemas';
import priceSchema from './schemas/priceSchema';

type TickerInfo = {
  pairName: string;
  lastPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume24h: string;
}

const allTickersSchema = z.unknown().array()
  .transform((tickers) => {
    const data = [...tickers];
    data.shift();
    const parsedDate = tickerInfoSchema.array().parse(data);
    return parsedDate.reduce<
      Partial<
        Record<
          string,
          TickerInfo
        >
      >
    >((prev, pairData) => ({
      ...prev,
      [pairData.pairName]: pairData,
    }), {});
  });

export const subscriptions = {
  [priceFeedSubscriptions.ALL_TICKERS]: {
    schema: allTickersSchema,
    payload: false as const,
  },
  [priceFeedSubscriptions.TICKER]: {
    schema: z.tuple([z.number(), tickerInfoSchema]),
    payload: true as const,
  },
  [priceFeedSubscriptions.LAST_PRICE]: {
    schema: priceSchema,
    payload: true as const,
  },
};

export type SubscriptionType = keyof typeof subscriptions

export type Payload<T extends SubscriptionType> = typeof subscriptions[T] extends { payload: true } ? string : undefined;

export type ResponseSchemaType<T extends SubscriptionType> = typeof subscriptions[T]['schema'];

export default class PriceFeedSubscription<S extends SubscriptionType> {
  public readonly id: string;

  private readonly callback: (data: z.infer<ResponseSchemaType<S>>) => void;

  private readonly payload: Payload<S>;

  private ws?: WebSocket;

  private readonly url: string;

  private heartbeatInterval?: ReturnType<typeof setInterval>;

  private readonly type: S;

  constructor(
    type: S,
    url: string,
    callback: (data: z.infer<ResponseSchemaType<S>>) => void,
    payload: Payload<S>,
  ) {
    this.id = uuidv4();
    this.url = url;
    this.type = type;
    this.payload = payload;
    this.callback = callback;

    this.init();
  }

  init() {
    const { payload, url, type } = this;
    this.ws = new WebSocket(`${url}/${type}${payload ? `/${payload.toString()}` : ''}`);

    this.ws.onmessage = (e) => {
      if (e.data === 'pong') return;
      const json: unknown = JSON.parse(e.data.toString());
      const subscription = subscriptions[type];
      const parseResult = subscription.schema.safeParse(json);
      if (parseResult.success === false) {
        const errorsMessage = parseResult.error.errors.map((error) => error.message).join(', ');
        throw new Error(`Can't recognize PriceFeed "${type}" subscription message "${e.data.toString()}": ${errorsMessage}`);
      }
      this.callback(parseResult.data);
    };

    this.ws.onclose = () => this.init();

    this.heartbeatInterval = setInterval(() => {
      this.ws?.send('heartbeat');
    }, 15000);
  }

  kill() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.ws?.close();
  }
}
