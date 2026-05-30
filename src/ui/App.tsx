import { useEffect, useState } from "react";
import { ControllerPrototype, StagePrototype } from "./controller/ControllerPrototype";
import {
  SERVICE_WORKER_UPDATE_EVENT,
  applyPendingServiceWorkerUpdate,
} from "./pwaUpdates";

type RouteKind = "home" | "stage" | "controller";

function getRouteKind(pathname: string): RouteKind {
  if (pathname.startsWith("/stage/")) return "stage";
  if (pathname.startsWith("/controller/") || pathname.startsWith("/join/")) {
    return "controller";
  }
  return "home";
}

export function App() {
  const route = getRouteKind(window.location.pathname);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    const onUpdateAvailable = () => setShowUpdatePrompt(true);
    window.addEventListener(SERVICE_WORKER_UPDATE_EVENT, onUpdateAvailable);
    return () => window.removeEventListener(SERVICE_WORKER_UPDATE_EVENT, onUpdateAvailable);
  }, []);

  if (route === "stage") {
    return (
      <>
        <StageShell />
        <UpdateAvailablePrompt
          visible={showUpdatePrompt}
          onDismiss={() => setShowUpdatePrompt(false)}
        />
      </>
    );
  }

  if (route === "controller") {
    return (
      <>
        <ControllerShell />
        <UpdateAvailablePrompt
          visible={showUpdatePrompt}
          onDismiss={() => setShowUpdatePrompt(false)}
        />
      </>
    );
  }

  return (
    <>
      <HomeShell />
      <UpdateAvailablePrompt
        visible={showUpdatePrompt}
        onDismiss={() => setShowUpdatePrompt(false)}
      />
    </>
  );
}

function HomeShell() {
  return (
    <main className="app-screen home-screen">
      <section className="home-panel" aria-labelledby="home-title">
        <p className="top-label">Local prototype</p>
        <h1 id="home-title">Boggle Party</h1>
        <p>
          Play the fixed-board round locally, or open the shared stage preview
          for the same board.
        </p>
        <div className="home-actions">
          <a className="primary-action" href="/controller/local">
            Play
          </a>
          <a className="secondary-action" href="/stage/local">
            Stage
          </a>
        </div>
      </section>
    </main>
  );
}

function StageShell() {
  return <StagePrototype />;
}

function ControllerShell() {
  return <ControllerPrototype />;
}

function UpdateAvailablePrompt({
  visible,
  onDismiss,
}: {
  visible: boolean;
  onDismiss: () => void;
}) {
  if (!visible) return null;

  return (
    <aside className="update-toast" role="status" aria-live="polite">
      <div>
        <strong>Update available</strong>
        <span>Reload for the newest version.</span>
      </div>
      <button className="update-toast-reload" type="button" onClick={applyPendingServiceWorkerUpdate}>
        Reload
      </button>
      <button className="update-toast-dismiss" type="button" onClick={onDismiss}>
        Later
      </button>
    </aside>
  );
}
