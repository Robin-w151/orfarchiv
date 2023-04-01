import type { Observable, Subscription as RxSubscription } from 'rxjs';
import type { Readable, Unsubscriber } from 'svelte/store';

export type Subscribable<T> = { subscribe: Readable<T>['subscribe'] | Observable<T>['subscribe'] };

export type Subscription = Unsubscriber | RxSubscription;

export function unsubscribeAll(subscriptions: Array<Subscription>): void {
  subscriptions?.forEach((subscription) =>
    'unsubscribe' in subscription ? subscription.unsubscribe() : subscription(),
  );
}
