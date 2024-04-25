export interface UpdateActions {
  restart: () => void;
}

let isRefreshing = false;

export async function listenForUpdates(callback: (actions: UpdateActions) => void) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) {
      return;
    }

    isRefreshing = true;
    window.location.reload();
  });

  const registration = await navigator.serviceWorker.ready;
  const actions: UpdateActions = { restart };

  function restart() {
    registration.waiting?.postMessage('SKIP_WAITING');
  }

  function awaitStateChange() {
    registration.installing?.addEventListener('statechange', function () {
      if (this.state === 'installed') {
        callback(actions);
      }
    });
  }

  if (!registration) {
    return;
  }

  if (registration.waiting) {
    return callback(actions);
  }

  if (registration.installing) {
    awaitStateChange();
  }

  registration.addEventListener('updatefound', awaitStateChange);
}
