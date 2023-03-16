import { Subject } from 'rxjs';
import { derived, type Readable } from 'svelte/store';

export function distinctUntilChanged<T>(store: Readable<T>, predicate: (t1: T, t2: T) => boolean): Readable<T> {
  let oldValue: T;
  return derived(store, (value, set) => {
    if (predicate(oldValue, value)) {
      oldValue = value;
      set(value);
    }
  });
}

export function createRxjsStore<T>(supplier?: () => Subject<T>) {
  const subject = supplier ? supplier() : new Subject<T>();
  const subscribe = subject.subscribe.bind(subject);
  const next = subject.next.bind(subject);
  return { subscribe, set: next };
}
