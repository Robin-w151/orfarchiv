import type { Subscription as RxSubscription } from 'rxjs';
import type { Unsubscriber } from 'svelte/store';

export type Subscription = Unsubscriber | RxSubscription;

export function unsubscribeAll(subscriptions: Array<Subscription>): void {
  subscriptions?.forEach((subscription) =>
    'unsubscribe' in subscription ? subscription.unsubscribe() : subscription(),
  );
}
