import { ControllerPrototype, StagePrototype } from "./controller/ControllerPrototype";

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

  if (route === "stage") {
    return <StageShell />;
  }

  if (route === "controller") {
    return <ControllerShell />;
  }

  return <HomeShell />;
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
