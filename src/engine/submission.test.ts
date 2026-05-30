import { describe, expect, it } from "vitest";
import { createBoardFromLetters } from "./board";
import { createDictionary } from "./dictionary";
import { validateSubmission } from "./submission";
import type { AcceptedSubmission } from "./types";

const board = createBoardFromLetters("submission-fixture", [
  "c a r t",
  "s e n d",
  "l i o n",
  "m a t e",
]);

const dictionary = createDictionary(["car", "cart", "send", "lion"]);

describe("submission validation", () => {
  it("accepts valid submissions before the cutoff", () => {
    const result = validateSubmission(
      {
        playerId: "p1",
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        submittedAtMs: 900,
      },
      {
        board,
        dictionary,
        minimumWordLength: 3,
        roundEndsAtMs: 1000,
        priorAcceptedSubmissions: [],
      },
    );

    expect(result.accepted).toBe(true);
    if (result.accepted) {
      expect(result.submission.normalizedWord).toBe("car");
    }
  });

  it("rejects submissions after the strict 0 ms cutoff", () => {
    const result = validateSubmission(
      {
        playerId: "p1",
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        submittedAtMs: 1001,
      },
      {
        board,
        dictionary,
        minimumWordLength: 3,
        roundEndsAtMs: 1000,
        priorAcceptedSubmissions: [],
      },
    );

    expect(result).toEqual({ accepted: false, reason: "round_ended" });
  });

  it("rejects duplicate words by the same player", () => {
    const prior: AcceptedSubmission[] = [
      {
        playerId: "p1",
        word: "car",
        normalizedWord: "car",
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        submittedAtMs: 500,
      },
    ];

    const result = validateSubmission(
      {
        playerId: "p1",
        path: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
        submittedAtMs: 900,
      },
      {
        board,
        dictionary,
        minimumWordLength: 3,
        roundEndsAtMs: 1000,
        priorAcceptedSubmissions: prior,
      },
    );

    expect(result).toEqual({ accepted: false, reason: "duplicate", word: "car" });
  });
});
