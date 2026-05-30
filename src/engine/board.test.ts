import { describe, expect, it } from "vitest";
import { createBoardFromLetters, generateBoard } from "./board";

describe("board generation", () => {
  it("generates deterministic boards for the same seed and size", () => {
    const first = generateBoard({ seed: "daily-seed", gridSize: 4 });
    const second = generateBoard({ seed: "daily-seed", gridSize: 4 });

    expect(second).toEqual(first);
  });

  it("generates different boards when size changes", () => {
    const four = generateBoard({ seed: "same-seed", gridSize: 4 });
    const five = generateBoard({ seed: "same-seed", gridSize: 5 });

    expect(four.tiles).toHaveLength(4);
    expect(five.tiles).toHaveLength(5);
    expect(five.tiles[0]).toHaveLength(5);
    expect(five.tiles).not.toEqual(four.tiles);
  });

  it("creates fixture boards from explicit letters", () => {
    const board = createBoardFromLetters("fixture", [
      "c a r t",
      "s e n d",
      "l i o n",
      "m a t e",
    ]);

    expect(board.tiles[0]![0]!.display).toBe("C");
    expect(board.tiles[3]![3]!.value).toBe("e");
  });
});
