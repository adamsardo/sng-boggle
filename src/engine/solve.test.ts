import { describe, expect, it } from "vitest";
import { createBoardFromLetters } from "./board";
import { createDictionary } from "./dictionary";
import { findAllValidWords } from "./solve";

const board = createBoardFromLetters("solve-fixture", [
  "c a r t",
  "s e n d",
  "l i o n",
  "m a t e",
]);

describe("valid word solver", () => {
  it("finds dictionary words that can be built on the board", () => {
    const dictionary = createDictionary(["car", "cart", "carts", "send", "lion", "zebra"]);
    const found = findAllValidWords(board, dictionary, 3);

    expect(found.has("car")).toBe(true);
    expect(found.has("cart")).toBe(true);
    expect(found.has("send")).toBe(true);
    expect(found.has("lion")).toBe(true);
    expect(found.has("zebra")).toBe(false);
  });

  it("respects minimum word length", () => {
    const dictionary = createDictionary(["car", "cart", "send"]);
    const found = findAllValidWords(board, dictionary, 4);

    expect(found.has("car")).toBe(false);
    expect(found.has("cart")).toBe(true);
  });
});
