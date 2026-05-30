import { validatePath } from "../../engine/path";
import { validateSubmission } from "../../engine/submission";
import type {
  AcceptedSubmission,
  Board,
  MinimumWordLength,
  TileCoord,
  WordDictionary,
} from "../../engine/types";
import { LOCAL_PLAYER_ID } from "./localRound";

export type ControllerPhase = "playing" | "results";
export type FeedbackKind = "accepted" | "rejected" | "info";

export type ControllerFeedback = {
  kind: FeedbackKind;
  message: string;
  word?: string;
};

export type HintDisplay = {
  word: string;
  path: TileCoord[];
  revealedCount: number;
  reducedMotion: boolean;
};

export type ControllerInputState = {
  phase: ControllerPhase;
  currentPath: TileCoord[];
  acceptedSubmissions: AcceptedSubmission[];
  feedback: ControllerFeedback | null;
  hint: HintDisplay | null;
  startedAtMs: number;
  roundEndsAtMs: number;
  nowMs: number;
};

export type ControllerInputContext = {
  board: Board;
  dictionary: WordDictionary;
  minimumWordLength: MinimumWordLength;
};

export type ControllerInputAction =
  | { type: "select_tile"; coord: TileCoord }
  | { type: "select_letter"; letter: string }
  | { type: "submit" }
  | { type: "clear" }
  | { type: "tick"; nowMs: number }
  | { type: "finish_round" }
  | { type: "restart"; nowMs: number; durationSeconds: number }
  | { type: "request_hint"; word: string; path: TileCoord[]; reducedMotion: boolean }
  | { type: "advance_hint" };

export function createInitialControllerInputState(
  nowMs: number,
  durationSeconds: number,
): ControllerInputState {
  return {
    phase: "playing",
    currentPath: [],
    acceptedSubmissions: [],
    feedback: null,
    hint: null,
    startedAtMs: nowMs,
    roundEndsAtMs: nowMs + durationSeconds * 1000,
    nowMs,
  };
}

export function reduceControllerInput(
  state: ControllerInputState,
  action: ControllerInputAction,
  context: ControllerInputContext,
): ControllerInputState {
  switch (action.type) {
    case "select_tile":
      return appendTile(state, action.coord, context.board);

    case "select_letter":
      return appendLetter(state, action.letter, context.board);

    case "submit":
      return submitPath(state, context);

    case "clear":
      return { ...state, currentPath: [], feedback: null };

    case "tick":
      if (state.phase === "results") {
        return { ...state, nowMs: action.nowMs };
      }
      if (action.nowMs >= state.roundEndsAtMs) {
        return finishRound({ ...state, nowMs: action.nowMs });
      }
      return { ...state, nowMs: action.nowMs };

    case "finish_round":
      return finishRound(state);

    case "restart":
      return createInitialControllerInputState(action.nowMs, action.durationSeconds);

    case "request_hint":
      if (state.phase !== "playing") return state;
      return {
        ...state,
        currentPath: [],
        hint: {
          word: action.word,
          path: clonePath(action.path),
          revealedCount: action.reducedMotion ? action.path.length : 1,
          reducedMotion: action.reducedMotion,
        },
        feedback: {
          kind: "info",
          message: action.reducedMotion ? "Hint path shown." : "Hint path started.",
          word: action.word,
        },
      };

    case "advance_hint":
      if (!state.hint || state.hint.reducedMotion) return state;
      return {
        ...state,
        hint: {
          ...state.hint,
          revealedCount: Math.min(state.hint.path.length, state.hint.revealedCount + 1),
        },
      };

    default:
      return state;
  }
}

export function selectedWord(board: Board, path: readonly TileCoord[]): string {
  const result = validatePath(board, path);
  return result.ok ? result.word.toUpperCase() : "";
}

export function remainingSeconds(state: ControllerInputState): number {
  return Math.max(0, Math.ceil((state.roundEndsAtMs - state.nowMs) / 1000));
}

export function tileKey(coord: TileCoord): string {
  return `${coord.row}:${coord.col}`;
}

export function pathContains(path: readonly TileCoord[], coord: TileCoord): boolean {
  return path.some((item) => item.row === coord.row && item.col === coord.col);
}

export function hintRevealContains(hint: HintDisplay | null, coord: TileCoord): boolean {
  if (!hint) return false;
  return hint.path.slice(0, hint.revealedCount).some((item) => sameCoord(item, coord));
}

function appendTile(
  state: ControllerInputState,
  coord: TileCoord,
  board: Board,
): ControllerInputState {
  if (state.phase !== "playing") return state;

  const tile = board.tiles[coord.row]?.[coord.col];
  if (!tile) {
    return rejectSelection(state, "That tile is outside the board.");
  }

  if (state.currentPath.length === 0) {
    return {
      ...state,
      currentPath: [cloneCoord(coord)],
      feedback: null,
      hint: null,
    };
  }

  if (pathContains(state.currentPath, coord)) {
    return rejectSelection(state, "A tile can only be used once.");
  }

  const previous = state.currentPath[state.currentPath.length - 1]!;
  if (!isAdjacent(previous, coord)) {
    return rejectSelection(state, "Tiles must be adjacent.");
  }

  return {
    ...state,
    currentPath: [...state.currentPath, cloneCoord(coord)],
    feedback: null,
    hint: null,
  };
}

function appendLetter(
  state: ControllerInputState,
  letter: string,
  board: Board,
): ControllerInputState {
  if (state.phase !== "playing") return state;
  const normalized = letter.trim().toLowerCase();
  if (!/^[a-z]$/.test(normalized)) return state;

  const candidates = board.tiles.flat().filter((tile) => tile.value.startsWith(normalized));
  const unusedCandidates = candidates.filter((tile) => !pathContains(state.currentPath, tile));
  const next =
    state.currentPath.length === 0
      ? unusedCandidates[0]
      : unusedCandidates.find((tile) =>
          isAdjacent(state.currentPath[state.currentPath.length - 1]!, tile),
        );

  if (!next) {
    return rejectSelection(state, `No adjacent ${normalized.toUpperCase()} tile is available.`);
  }

  return appendTile(state, next, board);
}

function submitPath(
  state: ControllerInputState,
  context: ControllerInputContext,
): ControllerInputState {
  if (state.phase !== "playing") return state;

  if (state.currentPath.length === 0) {
    return {
      ...state,
      feedback: { kind: "info", message: "Select tiles to make a word." },
    };
  }

  const result = validateSubmission(
    {
      playerId: LOCAL_PLAYER_ID,
      path: state.currentPath,
      submittedAtMs: state.nowMs,
    },
    {
      board: context.board,
      dictionary: context.dictionary,
      minimumWordLength: context.minimumWordLength,
      roundEndsAtMs: state.roundEndsAtMs,
      priorAcceptedSubmissions: state.acceptedSubmissions,
    },
  );

  if (result.accepted) {
    const word = result.submission.normalizedWord.toUpperCase();
    return {
      ...state,
      currentPath: [],
      acceptedSubmissions: [...state.acceptedSubmissions, result.submission],
      feedback: { kind: "accepted", message: `Added ${word}.`, word },
      hint: null,
    };
  }

  return {
    ...state,
    currentPath: [],
    feedback: {
      kind: "rejected",
      message: rejectionMessage(result.reason, result.pathReason),
      word: result.word?.toUpperCase(),
    },
    hint: null,
  };
}

function finishRound(state: ControllerInputState): ControllerInputState {
  return {
    ...state,
    phase: "results",
    currentPath: [],
    hint: null,
    feedback: { kind: "info", message: "Round complete." },
    nowMs: Math.max(state.nowMs, state.roundEndsAtMs),
  };
}

function rejectSelection(state: ControllerInputState, message: string): ControllerInputState {
  return {
    ...state,
    feedback: { kind: "rejected", message },
    hint: null,
  };
}

function rejectionMessage(
  reason: "round_ended" | "invalid_path" | "too_short" | "not_in_word_list" | "duplicate",
  pathReason?: "empty_path" | "out_of_bounds" | "reused_tile" | "not_adjacent",
): string {
  if (reason === "duplicate") return "Already found.";
  if (reason === "too_short") return "Too short.";
  if (reason === "not_in_word_list") return "Not in word list.";
  if (reason === "round_ended") return "Round ended.";
  if (pathReason === "reused_tile") return "A tile can only be used once.";
  if (pathReason === "not_adjacent") return "Tiles must be adjacent.";
  return "That path is not valid.";
}

function isAdjacent(first: TileCoord, second: TileCoord): boolean {
  const rowDelta = Math.abs(first.row - second.row);
  const colDelta = Math.abs(first.col - second.col);
  return rowDelta <= 1 && colDelta <= 1 && rowDelta + colDelta > 0;
}

function sameCoord(first: TileCoord, second: TileCoord): boolean {
  return first.row === second.row && first.col === second.col;
}

function cloneCoord(coord: TileCoord): TileCoord {
  return { row: coord.row, col: coord.col };
}

function clonePath(path: readonly TileCoord[]): TileCoord[] {
  return path.map(cloneCoord);
}
