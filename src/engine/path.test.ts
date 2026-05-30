import { describe, expect, it } from "vitest";
import { createBoardFromLetters } from "./board";
import { validatePath } from "./path";

const board = createBoardFromLetters("path-fixture", [
  "c a r t",
  "s e n d",
  "l i o n",
  "m a t e",
]);

describe("path validation", () => {
  it("accepts adjacent paths and returns the word", () => {
    const result = validatePath(board, [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ]);

    expect(result).toEqual({
      ok: true,
      word: "car",
      normalizedWord: "car",
      path: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
      ],
    });
  });

  it("rejects non-adjacent jumps", () => {
    expect(
      validatePath(board, [
        { row: 0, col: 0 },
        { row: 0, col: 2 },
      ]),
    ).toEqual({ ok: false, reason: "not_adjacent" });
  });

  it("rejects reused tiles", () => {
    expect(
      validatePath(board, [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 0 },
      ]),
    ).toEqual({ ok: false, reason: "reused_tile" });
  });

  it("rejects out-of-bounds coordinates", () => {
    expect(validatePath(board, [{ row: 9, col: 9 }])).toEqual({
      ok: false,
      reason: "out_of_bounds",
    });
  });
});
