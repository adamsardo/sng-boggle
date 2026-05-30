import { describe, expect, it } from "vitest";
import { baseScore, scoreRound } from "./scoring";
import type { AcceptedSubmission } from "./types";

function submission(playerId: string, normalizedWord: string): AcceptedSubmission {
  return {
    playerId,
    word: normalizedWord,
    normalizedWord,
    path: [],
    submittedAtMs: 1,
  };
}

describe("scoring", () => {
  it("uses Netflix-style length scoring", () => {
    expect(baseScore("to")).toBe(0);
    expect(baseScore("car")).toBe(1);
    expect(baseScore("cars")).toBe(2);
    expect(baseScore("carts")).toBe(3);
    expect(baseScore("carted")).toBe(4);
  });

  it("doubles words found by only one player", () => {
    const scores = scoreRound({
      playerIds: ["p1", "p2"],
      submissions: [submission("p1", "car"), submission("p2", "cart")],
    });

    expect(scores.find((line) => line.playerId === "p1")?.finalScore).toBe(2);
    expect(scores.find((line) => line.playerId === "p2")?.finalScore).toBe(4);
  });

  it("does not double words found by multiple players", () => {
    const scores = scoreRound({
      playerIds: ["p1", "p2"],
      submissions: [submission("p1", "car"), submission("p2", "car")],
    });

    expect(scores.find((line) => line.playerId === "p1")?.finalScore).toBe(1);
    expect(scores.find((line) => line.playerId === "p2")?.finalScore).toBe(1);
  });

  it("removes the unique bonus when a unique word challenge is rejected", () => {
    const scores = scoreRound({
      playerIds: ["p1", "p2"],
      submissions: [submission("p1", "cart"), submission("p2", "send")],
      challenges: [{ ownerPlayerId: "p1", normalizedWord: "cart", status: "rejected" }],
    });

    const p1 = scores.find((line) => line.playerId === "p1");
    expect(p1?.baseScore).toBe(2);
    expect(p1?.uniqueBonus).toBe(0);
    expect(p1?.challengeAdjustments).toBe(-2);
    expect(p1?.finalScore).toBe(0);
  });

  it("keeps disconnected player submissions in scoring input", () => {
    const scores = scoreRound({
      playerIds: ["connected", "disconnected"],
      submissions: [submission("disconnected", "carts"), submission("connected", "send")],
    });

    expect(scores.find((line) => line.playerId === "disconnected")?.finalScore).toBe(6);
  });
});
