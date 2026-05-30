let pendingUpdateRegistration: ServiceWorkerRegistration | null = null;
let reloadAfterControllerChange = false;

export const SERVICE_WORKER_UPDATE_EVENT = "boggle:service-worker-update";

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!reloadAfterControllerChange) return;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        watchForWaitingWorker(registration);
      })
      .catch((error: unknown) => {
        console.warn("Service worker registration failed.", error);
      });
  });
}

export function applyPendingServiceWorkerUpdate(): void {
  const waitingWorker = pendingUpdateRegistration?.waiting;
  if (!waitingWorker) return;
  reloadAfterControllerChange = true;
  waitingWorker.postMessage({ type: "SKIP_WAITING" });
}

function watchForWaitingWorker(registration: ServiceWorkerRegistration): void {
  notifyIfUpdateIsWaiting(registration);

  registration.addEventListener("updatefound", () => {
    const installingWorker = registration.installing;
    if (!installingWorker) return;

    installingWorker.addEventListener("statechange", () => {
      if (installingWorker.state === "installed") {
        notifyIfUpdateIsWaiting(registration);
      }
    });
  });
}

function notifyIfUpdateIsWaiting(registration: ServiceWorkerRegistration): void {
  if (!navigator.serviceWorker.controller || !registration.waiting) return;
  pendingUpdateRegistration = registration;
  window.dispatchEvent(new Event(SERVICE_WORKER_UPDATE_EVENT));
}
