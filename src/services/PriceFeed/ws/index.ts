import { z } from 'zod';
import PriceFeedSubscription, { Payload, ResponseSchemaType, SubscriptionType } from './PriceFeedSubscription';

export * as schemas from './schemas';
export class PriceFeedWS {
  private subscriptions: Partial<{
    [S in SubscriptionType]: PriceFeedSubscription<S>
  }> = { };

  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  subscribe<S extends SubscriptionType>(
    type: S,
    callback: (data: z.infer<ResponseSchemaType<S>>) => void,
    payload: Payload<S>,
  ) {
    if (this.subscriptions[type]) throw new Error(`Subscription already exists for '${type}'. Please unsubscribe first.`);
    this.subscriptions = {
      ...this.subscriptions,
      [type]: new PriceFeedSubscription(
        type,
        this.url,
        callback,
        payload,
      ),
    };
  }

  unsubscribe<S extends SubscriptionType>(type: S) {
    this.subscriptions[type]?.kill();
    delete this.subscriptions[type];
  }
}
