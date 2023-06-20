import type WebSocket from 'ws';
import PriceFeedSubscription, { type SubscriptionType, type Subscription } from './PriceFeedSubscription.js';
import type { BasicAuthCredentials } from '../../../types.js';

export * as schemas from './schemas/index.js';
export class PriceFeedWS {
  private subscriptions: Partial<{
    [K in SubscriptionType]: Partial<
      Record<
        string,
        PriceFeedSubscription<K>
      >
    >;
  }> = {};

  private readonly url: string;

  readonly basicAuth?: BasicAuthCredentials | undefined;

  constructor(url: string, basicAuth?: BasicAuthCredentials) {
    this.url = url;
    this.basicAuth = basicAuth;
  }

  get api() {
    const url = new URL(this.url);

    if (this.basicAuth) {
      url.username = this.basicAuth.username;
      url.password = this.basicAuth.password;
    }

    return url.toString();
  }

  subscribe<S extends SubscriptionType>(
    type: S,
    params: Subscription<S>,
    onOpen?: (event: WebSocket.Event) => void,
  ) {
    const sub = new PriceFeedSubscription(
      type,
      this.api,
      params,
      onOpen
    );
    this.subscriptions = {
      ...this.subscriptions,
      [type]: {
        ...this.subscriptions[type],
        [sub.id]: sub,
      },
    };
    return {
      type: sub.type,
      id: sub.id,
      unsubscribe: () => { this.unsubscribe(sub.type, sub.id); },
    };
  }

  unsubscribe(subType: SubscriptionType, subId: string) {
    this.subscriptions[subType]?.[subId]?.kill();
    delete this.subscriptions[subType]?.[subId];
  }
}
