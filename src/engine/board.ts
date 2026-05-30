import { pickWeighted, createSeededRng } from "./rng";
import type { Board, GenerateBoardOptions, LetterTile } from "./types";

const LETTER_WEIGHTS: readonly { item: string; weight: number }[] = [
  { item: "a", weight: 8.2 },
  { item: "b", weight: 1.5 },
  { item: "c", weight: 2.8 },
  { item: "d", weight: 4.3 },
  { item: "e", weight: 12.7 },
  { item: "f", weight: 2.2 },
  { item: "g", weight: 2 },
  { item: "h", weight: 6.1 },
  { item: "i", weight: 7 },
  { item: "j", weight: 0.15 },
  { item: "k", weight: 0.8 },
  { item: "l", weight: 4 },
  { item: "m", weight: 2.4 },
  { item: "n", weight: 6.7 },
  { item: "o", weight: 7.5 },
  { item: "p", weight: 1.9 },
  { item: "qu", weight: 0.95 },
  { item: "r", weight: 6 },
  { item: "s", weight: 6.3 },
  { item: "t", weight: 9.1 },
  { item: "u", weight: 2.8 },
  { item: "v", weight: 1 },
  { item: "w", weight: 2.4 },
  { item: "x", weight: 0.15 },
  { item: "y", weight: 2 },
  { item: "z", weight: 0.07 },
];

export function generateBoard(options: GenerateBoardOptions): Board {
  const rng = createSeededRng(`${options.seed}:${options.gridSize}`);
  const tiles: LetterTile[][] = [];

  for (let row = 0; row < options.gridSize; row += 1) {
    const line: LetterTile[] = [];
    for (let col = 0; col < options.gridSize; col += 1) {
      const value = pickWeighted(rng, LETTER_WEIGHTS);
      line.push({
        row,
        col,
        id: `${row}-${col}`,
        value,
        display: value === "qu" ? "Qu" : value.toUpperCase(),
      });
    }
    tiles.push(line);
  }

  return {
    seed: options.seed,
    gridSize: options.gridSize,
    tiles,
  };
}

export function createBoardFromLetters(seed: string, rows: readonly string[]): Board {
  const gridSize = rows.length;
  if (gridSize !== 4 && gridSize !== 5 && gridSize !== 6) {
    throw new Error("Fixture boards must be 4x4, 5x5, or 6x6.");
  }

  const tiles = rows.map((rowText, row) => {
    const letters = rowText.trim().split(/\s+/);
    if (letters.length !== gridSize) {
      throw new Error("Fixture board rows must match grid size.");
    }

    return letters.map((letter, col) => {
      const value = letter.toLowerCase();
      return {
        row,
        col,
        id: `${row}-${col}`,
        value,
        display: value === "qu" ? "Qu" : value.toUpperCase(),
      };
    });
  });

  return { seed, gridSize, tiles };
}
