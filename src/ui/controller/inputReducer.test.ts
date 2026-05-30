import { describe, expect, it } from "vitest";
import {
  createInitialControllerInputState,
  reduceControllerInput,
  remainingSeconds,
  selectedWord,
  type ControllerInputAction,
  type ControllerInputContext,
} from "./inputReducer";
import {
  LOCAL_MINIMUM_WORD_LENGTH,
  LOCAL_ROUND_DURATION_SECONDS,
  localBoard,
  localDictionary,
  localHints,
} from "./localRound";

const context: ControllerInputContext = {
  board: localBoard,
  dictionary: localDictionary,
  minimumWordLength: LOCAL_MINIMUM_WORD_LENGTH,
};

function reduceAll(actions: ControllerInputAction[]) {
  return actions.reduce(
    (state, action) => reduceControllerInput(state, action, context),
    createInitialControllerInputState(1_000, LOCAL_ROUND_DURATION_SECONDS),
  );
}

describe("controller input reducer", () => {
  it("accepts a valid tapped word", () => {
    const state = reduceAll([
      { type: "select_tile", coord: { row: 0, col: 0 } },
      { type: "select_tile", coord: { row: 0, col: 1 } },
      { type: "select_tile", coord: { row: 0, col: 2 } },
      { type: "submit" },
    ]);

    expect(state.feedback).toEqual({
      kind: "accepted",
      message: "Added CAR.",
      word: "CAR",
    });
    expect(state.acceptedSubmissions).toHaveLength(1);
    expect(state.acceptedSubmissions[0]?.normalizedWord).toBe("car");
  });

  it("builds a word from keyboard letters", () => {
    const state = reduceAll([
      { type: "select_letter", letter: "c" },
      { type: "select_letter", letter: "a" },
      { type: "select_letter", letter: "r" },
    ]);

    expect(selectedWord(localBoard, state.currentPath)).toBe("CAR");
  });

  it("accepts common fixed-board words from the generated dictionary subset", () => {
    const state = reduceAll([
      { type: "select_tile", coord: { row: 3, col: 0 } },
      { type: "select_tile", coord: { row: 3, col: 1 } },
      { type: "select_tile", coord: { row: 3, col: 2 } },
      { type: "submit" },
    ]);

    expect(state.feedback).toEqual({
      kind: "accepted",
      message: "Added MAT.",
      word: "MAT",
    });
    expect(state.acceptedSubmissions[0]?.normalizedWord).toBe("mat");
  });

  it("rejects non-adjacent tile jumps before submission", () => {
    const state = reduceAll([
      { type: "select_tile", coord: { row: 0, col: 0 } },
      { type: "select_tile", coord: { row: 0, col: 3 } },
    ]);

    expect(state.feedback).toEqual({
      kind: "rejected",
      message: "Tiles must be adjacent.",
    });
    expect(selectedWord(localBoard, state.currentPath)).toBe("C");
  });

  it("rejects duplicate submissions from the same player", () => {
    const state = reduceAll([
      { type: "select_tile", coord: { row: 0, col: 0 } },
      { type: "select_tile", coord: { row: 0, col: 1 } },
      { type: "select_tile", coord: { row: 0, col: 2 } },
      { type: "submit" },
      { type: "select_tile", coord: { row: 0, col: 0 } },
      { type: "select_tile", coord: { row: 0, col: 1 } },
      { type: "select_tile", coord: { row: 0, col: 2 } },
      { type: "submit" },
    ]);

    expect(state.feedback?.kind).toBe("rejected");
    expect(state.feedback?.message).toBe("Already found.");
    expect(state.acceptedSubmissions).toHaveLength(1);
  });

  it("uses sequential hint reveal by default", () => {
    const hint = localHints[0]!;
    const state = reduceAll([
      { type: "request_hint", word: hint.word, path: hint.path, reducedMotion: false },
      { type: "advance_hint" },
    ]);

    expect(state.hint?.reducedMotion).toBe(false);
    expect(state.hint?.revealedCount).toBe(2);
  });

  it("reveals the full hint immediately for reduced motion", () => {
    const hint = localHints[0]!;
    const state = reduceAll([
      { type: "request_hint", word: hint.word, path: hint.path, reducedMotion: true },
      { type: "advance_hint" },
    ]);

    expect(state.hint?.reducedMotion).toBe(true);
    expect(state.hint?.revealedCount).toBe(hint.path.length);
  });

  it("ends the local round when the timer reaches zero", () => {
    const state = reduceAll([
      {
        type: "tick",
        nowMs: 1_000 + LOCAL_ROUND_DURATION_SECONDS * 1000 + 1,
      },
    ]);

    expect(state.phase).toBe("results");
    expect(remainingSeconds(state)).toBe(0);
  });
});
