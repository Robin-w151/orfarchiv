import type { Unsubscriber } from 'svelte/store';

export function unsubscribeAll(subscriptions: Array<Unsubscriber>): void {
  subscriptions?.forEach((subscription) => subscription());
}
