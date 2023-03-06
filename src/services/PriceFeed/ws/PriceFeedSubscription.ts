import WebSocket from 'isomorphic-ws';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import priceFeedSubscriptions from './priceFeedSubscriptions';
import { tickerInfoSchema, candleSchema } from './schemas';
import priceSchema from './schemas/priceSchema';
import type { AnyJSON } from '../../../types';

type TickerInfo = {
  pairName: string
  lastPrice: string
  openPrice: string
  highPrice: string
  lowPrice: string
  volume24h: string
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
  [priceFeedSubscriptions.CANDLE]: {
    schema: candleSchema,
    payload: true as const,
  },
};

export type SubscriptionType = keyof typeof subscriptions;
export type Subscription<
  T extends SubscriptionType,
  Schema = z.infer<typeof subscriptions[T]['schema']>
> = typeof subscriptions[T] extends { payload: true }
  ? {
    callback: (data: Schema) => void
    payload: string
  } : {
    callback: (data: Schema) => void
  }

export default class PriceFeedSubscription<T extends SubscriptionType = SubscriptionType> {
  public readonly id: string;

  private readonly callback: Subscription<T>['callback'];

  private readonly payload?: string;

  private ws?: WebSocket;

  private readonly url: string;

  private heartbeatInterval?: ReturnType<typeof setInterval>;

  readonly type: T;

  // is used to make sure we do not need to renew ws subscription
  // we can not be sure that onclose event will recieve our code when we do `ws.close(4000)`
  // since sometimes it can be replaced with system one.
  // https://stackoverflow.com/questions/19304157/getting-the-reason-why-websockets-closed-with-close-code-1006
  private isClosedIntentionally = false;

  private readonly onOpen: ((event: WebSocket.Event) => void) | undefined;

  constructor(
    type: T,
    url: string,
    params: Subscription<T>,
    onOpen?: (event: WebSocket.Event) => void,
  ) {
    this.id = uuidv4();
    this.url = url;
    this.type = type;
    if ('payload' in params) {
      this.payload = params.payload;
    }
    this.callback = params.callback;
    this.onOpen = onOpen;
    this.init();
  }

  private send(jsonObject: AnyJSON) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const jsonData = JSON.stringify(jsonObject);
      this.ws.send(jsonData);
    } else {
      setTimeout(() => {
        this.send(jsonObject);
      }, 50);
    }
  }

  init() {
    this.isClosedIntentionally = false;

    const { payload, url, type } = this;
    this.ws = new WebSocket(`${url}/${type}${payload !== undefined ? `/${payload.toString()}` : ''}`);

    if (this.onOpen !== undefined) {
      this.ws.onopen = this.onOpen;
    }
    this.ws.onmessage = (e) => {
      const { data } = e;

      // Convert data to string

      let dataString: string;
      if (typeof data === 'string') {
        dataString = data;
      } else if (Buffer.isBuffer(data)) {
        dataString = data.toString();
      } else if (Array.isArray(data)) {
        dataString = Buffer.concat(data).toString();
      } else { // ArrayBuffer
        dataString = Buffer.from(data).toString();
      }

      if (dataString === 'pong') return;
      const json: unknown = JSON.parse(dataString);
      const subscription = subscriptions[type];
      const parseResult = subscription.schema.safeParse(json);
      if (!parseResult.success) {
        const errorsMessage = parseResult.error.errors.map((error) => `[${error.path.join('.')}] ${error.message}`).join(', ');
        throw new Error(`Can't recognize PriceFeed "${type}" subscription message "${dataString}": ${errorsMessage}`);
      }
      this.callback(parseResult.data);
    };

    this.ws.onclose = () => {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
      if (!this.isClosedIntentionally) this.init();
    };

    this.heartbeatInterval = setInterval(() => {
      this.send('heartbeat');
    }, 15000);
  }

  kill() {
    this.isClosedIntentionally = true;
    this.ws?.close();
  }
}
