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
    const parsedData = tickerInfoSchema.array().parse(data);
    return parsedData.reduce<
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
    schema: z.tuple([z.number(), tickerInfoSchema]).transform(([, tickerInfo]) => tickerInfo),
    payload: true as const,
  },
  [priceFeedSubscriptions.LAST_PRICE]: {
    schema: priceSchema,
    payload: true as const,
  },
};

export type SubscriptionType = keyof typeof subscriptions;
export type Subscription<
  T extends SubscriptionType,
  Schema = z.infer<typeof subscriptions[T]['schema']>
> = typeof subscriptions[T] extends { payload: true }
  ? {
  callback: (data: Schema) => void,
  payload: string,
} : {
   callback: (data: Schema) => void,
}

export default class PriceFeedSubscription<T extends SubscriptionType = SubscriptionType> {
  public readonly id: string;

  private readonly callback: Subscription<T>['callback'];

  private readonly payload?: string;

  private ws?: WebSocket;

  private readonly url: string;

  private heartbeatInterval?: ReturnType<typeof setInterval>;

  readonly type: T;

  constructor(
    type: T,
    url: string,
    params: Subscription<T>,
  ) {
    this.id = uuidv4();
    this.url = url;
    this.type = type;
    if ('payload' in params) {
      this.payload = params.payload;
    }
    this.callback = params.callback;

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
        const errorsMessage = parseResult.error.errors.map((error) => `[${error.path.join('.')}] ${error.message}`).join(', ');
        throw new Error(`Can't recognize PriceFeed "${type}" subscription message "${e.data.toString()}": ${errorsMessage}`);
      }
      this.callback(parseResult.data);
    };

    this.ws.onclose = (e) => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      if (this.ws) this.init();
    };

    this.heartbeatInterval = setInterval(() => {
      this.ws?.send('heartbeat');
    }, 15000);
  }

  kill() {
    this.ws?.close();
    delete this.ws;
  }
}
