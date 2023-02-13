import PriceFeedSubscription, { type SubscriptionType, type Subscription } from './PriceFeedSubscription';

export * as schemas from './schemas';
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

  constructor(url: string) {
    this.url = url;
  }

  subscribe<S extends SubscriptionType>(
    type: S,
    params: Subscription<S>,
  ) {
    const sub = new PriceFeedSubscription(
      type,
      this.url,
      params,
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
