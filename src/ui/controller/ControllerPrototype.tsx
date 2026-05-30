import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { scoreRound } from "../../engine/scoring";
import type { TileCoord } from "../../engine/types";
import {
  createInitialControllerInputState,
  hintRevealContains,
  pathContains,
  reduceControllerInput,
  remainingSeconds,
  selectedWord,
  type ControllerInputContext,
} from "./inputReducer";
import {
  LOCAL_MINIMUM_WORD_LENGTH,
  LOCAL_PLAYER_ID,
  LOCAL_ROUND_DURATION_SECONDS,
  localBoard,
  localDictionary,
  pickNextHint,
} from "./localRound";

type SwipeSession = {
  pointerId: number;
  startX: number;
  startY: number;
  startCoord: TileCoord;
  lastCoord: TileCoord | null;
  active: boolean;
};

export function ControllerPrototype() {
  const context = useMemo<ControllerInputContext>(
    () => ({
      board: localBoard,
      dictionary: localDictionary,
      minimumWordLength: LOCAL_MINIMUM_WORD_LENGTH,
    }),
    [],
  );
  const durationSeconds = useMemo(readDurationSeconds, []);
  const reducedMotion = useReducedMotion();
  const swipeSession = useRef<SwipeSession | null>(null);
  const ignoreNextClick = useRef(false);
  const boardRef = useRef<HTMLDivElement | null>(null);

  const [state, dispatch] = useReducer(
    (current, action) => reduceControllerInput(current, action, context),
    undefined,
    () => createInitialControllerInputState(Date.now(), durationSeconds),
  );

  const currentWord = selectedWord(localBoard, state.currentPath);
  const foundWords = useMemo(
    () => new Set(state.acceptedSubmissions.map((submission) => submission.normalizedWord)),
    [state.acceptedSubmissions],
  );
  const score = useMemo(
    () =>
      scoreRound({
        playerIds: [LOCAL_PLAYER_ID],
        submissions: state.acceptedSubmissions,
      })[0],
    [state.acceptedSubmissions],
  );

  useEffect(() => {
    if (state.phase !== "playing") return undefined;
    const timer = window.setInterval(() => {
      dispatch({ type: "tick", nowMs: Date.now() });
    }, 250);
    return () => window.clearInterval(timer);
  }, [state.phase]);

  useEffect(() => {
    if (!state.hint || state.hint.reducedMotion) return undefined;
    if (state.hint.revealedCount >= state.hint.path.length) return undefined;
    const timer = window.setInterval(() => {
      dispatch({ type: "advance_hint" });
    }, 180);
    return () => window.clearInterval(timer);
  }, [state.hint]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

      if (event.key === "Enter") {
        event.preventDefault();
        dispatch({ type: "submit" });
        return;
      }

      if (event.key === "Backspace" || event.key === "Escape") {
        event.preventDefault();
        dispatch({ type: "clear" });
        return;
      }

      if (/^[a-z]$/i.test(event.key)) {
        event.preventDefault();
        dispatch({ type: "select_letter", letter: event.key });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const requestHint = useCallback(() => {
    const hint = pickNextHint(foundWords);
    dispatch({
      type: "request_hint",
      word: hint.word,
      path: hint.path,
      reducedMotion,
    });
  }, [foundWords, reducedMotion]);

  const restart = useCallback(() => {
    dispatch({ type: "restart", nowMs: Date.now(), durationSeconds });
  }, [durationSeconds]);

  const selectTile = useCallback((coord: TileCoord) => {
    dispatch({ type: "select_tile", coord });
  }, []);

  const onTileClick = useCallback(
    (coord: TileCoord) => {
      if (ignoreNextClick.current) {
        ignoreNextClick.current = false;
        return;
      }
      selectTile(coord);
    },
    [selectTile],
  );

  const onPointerDown = useCallback((event: PointerEvent, coord: TileCoord) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    swipeSession.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCoord: coord,
      lastCoord: null,
      active: false,
    };
  }, []);

  const onPointerMove = useCallback((event: PointerEvent) => {
    const session = swipeSession.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY);
    if (!session.active && distance < 10) return;

    if (!session.active) {
      session.active = true;
      ignoreNextClick.current = true;
      session.lastCoord = session.startCoord;
      dispatch({ type: "clear" });
      dispatch({ type: "select_tile", coord: session.startCoord });
    }

    const coord = coordFromPoint(event.clientX, event.clientY);
    if (coord && !sameCoord(coord, session.lastCoord)) {
      session.lastCoord = coord;
      dispatch({ type: "select_tile", coord });
    }
  }, []);

  const onPointerUp = useCallback((event: PointerEvent) => {
    const session = swipeSession.current;
    if (!session || session.pointerId !== event.pointerId) return;
    if (session.active) {
      suppressNextTileClick(ignoreNextClick);
      dispatch({ type: "submit" });
    }
    swipeSession.current = null;
  }, []);

  if (state.phase === "results") {
    return (
      <main className="app-screen controller-screen results-screen">
        <section className="results-card" aria-labelledby="results-title">
          <p className="top-label">Round complete</p>
          <h1 id="results-title">Results</h1>
          <div className="result-score" data-testid="final-score">
            {score?.finalScore ?? 0}
            <span>pts</span>
          </div>
          <dl className="result-stats">
            <div>
              <dt>Words</dt>
              <dd data-testid="result-word-count">{score?.acceptedWordCount ?? 0}</dd>
            </div>
            <div>
              <dt>Longest</dt>
              <dd>{score?.longestWord?.toUpperCase() ?? "-"}</dd>
            </div>
            <div>
              <dt>Unique</dt>
              <dd>{score?.uniqueWordCount ?? 0}</dd>
            </div>
          </dl>
          <ul className="word-list" aria-label="Accepted words">
            {state.acceptedSubmissions.map((submission) => (
              <li key={`${submission.playerId}-${submission.normalizedWord}`}>
                {submission.normalizedWord.toUpperCase()}
              </li>
            ))}
          </ul>
          <button className="primary-action" type="button" onClick={restart}>
            Play again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="app-screen controller-screen">
      <section className="controller-card" aria-label="Local Boggle controller">
        <header className="controller-header">
          <div className="timer-pill" aria-label={`${remainingSeconds(state)} seconds left`}>
            <span aria-hidden="true">TIME</span>
            <strong data-testid="timer">{formatTime(remainingSeconds(state))}</strong>
          </div>
          <div className="found-pill">
            <span>Words</span>
            <strong data-testid="found-count">{state.acceptedSubmissions.length}</strong>
          </div>
        </header>

        <div className="word-preview" data-testid="current-word" aria-live="polite">
          {currentWord || "Pick tiles"}
        </div>

        <div
          className="feedback-line"
          data-kind={state.feedback?.kind ?? "idle"}
          data-testid="feedback"
          aria-live="polite"
        >
          {state.feedback?.message ?? "Find a word on the board."}
        </div>

        <div
          className="controller-board"
          data-testid="controller-board"
          ref={boardRef}
          role="grid"
          aria-label="Boggle board"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            swipeSession.current = null;
          }}
        >
          {localBoard.tiles.flat().map((tile) => {
            const coord = { row: tile.row, col: tile.col };
            const selected = pathContains(state.currentPath, coord);
            const hinted = hintRevealContains(state.hint, coord);
            return (
              <button
                className="letter-tile"
                data-selected={selected}
                data-hinted={hinted}
                data-testid={`tile-${tile.row}-${tile.col}`}
                data-tile-coord={`${tile.row},${tile.col}`}
                key={tile.id}
                role="gridcell"
                type="button"
                aria-label={`Tile ${tile.display}, row ${tile.row + 1}, column ${tile.col + 1}`}
                onClick={() => onTileClick(coord)}
                onPointerDown={(event) => onPointerDown(event, coord)}
              >
                {tile.display}
              </button>
            );
          })}
        </div>

        <div className="controller-actions">
          <button className="secondary-action" type="button" onClick={() => dispatch({ type: "clear" })}>
            Clear
          </button>
          <button className="primary-action" type="button" onClick={() => dispatch({ type: "submit" })}>
            Submit
          </button>
          <button
            className="hint-action"
            data-testid="hint-button"
            type="button"
            onClick={requestHint}
          >
            Hint
          </button>
        </div>

        <div
          className="hint-status"
          data-testid="hint-status"
          data-hint-mode={state.hint?.reducedMotion ? "static" : state.hint ? "sequence" : "idle"}
        >
          {state.hint ? `Hint: ${state.hint.word.length} letters` : "Hints ready"}
        </div>

        <button className="end-round-action" type="button" onClick={() => dispatch({ type: "finish_round" })}>
          End round
        </button>
      </section>
    </main>
  );
}

export function StagePrototype() {
  return (
    <main className="app-screen stage-screen">
      <section className="stage-panel" aria-label="Stage board preview">
        <div>
          <p className="top-label">Local Stage</p>
          <h1>Boggle Party</h1>
          <p className="stage-copy">Fixed-board preview for the single-device round.</p>
        </div>
        <div className="stage-board" data-testid="stage-board">
          {localBoard.tiles.flat().map((tile) => (
            <span key={tile.id}>{tile.display}</span>
          ))}
        </div>
      </section>
    </main>
  );
}

function useReducedMotion(): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setMatches(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return matches;
}

function coordFromPoint(x: number, y: number): TileCoord | null {
  const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-tile-coord]");
  const value = element?.dataset.tileCoord;
  if (!value) return null;
  const [row, col] = value.split(",").map(Number);
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  return { row, col };
}

function sameCoord(first: TileCoord | null, second: TileCoord | null): boolean {
  return !!first && !!second && first.row === second.row && first.col === second.col;
}

function suppressNextTileClick(ignoreNextClick: { current: boolean }): void {
  ignoreNextClick.current = true;
  window.setTimeout(() => {
    ignoreNextClick.current = false;
  }, 0);
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function readDurationSeconds(): number {
  const value = new URLSearchParams(window.location.search).get("duration");
  const parsed = value ? Number(value) : LOCAL_ROUND_DURATION_SECONDS;
  if (!Number.isFinite(parsed)) return LOCAL_ROUND_DURATION_SECONDS;
  return Math.min(180, Math.max(5, Math.floor(parsed)));
}
