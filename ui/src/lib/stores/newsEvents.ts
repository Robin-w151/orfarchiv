import { writable } from 'svelte/store';

export const refreshNews = createEventStore();

export const loadMoreNews = createEventStore();

export const startSearch = createEventStore();

function createEventStore() {
  const { subscribe, update } = writable<number>(0);

  function onUpdate(handler: () => void) {
    let initialEventFired = false;
    return subscribe(() => {
      if (!initialEventFired) {
        initialEventFired = true;
      } else {
        handler();
      }
    });
  }

  function notify() {
    update((n) => n + 1);
  }

  return { subscribe, onUpdate, notify };
}
