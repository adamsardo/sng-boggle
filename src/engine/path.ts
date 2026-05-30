import { normalizeWord } from "./dictionary";
import type { Board, PathValidationResult, TileCoord } from "./types";

export function validatePath(board: Board, path: readonly TileCoord[]): PathValidationResult {
  if (path.length === 0) {
    return { ok: false, reason: "empty_path" };
  }

  const seen = new Set<string>();
  const letters: string[] = [];

  for (let index = 0; index < path.length; index += 1) {
    const coord = path[index]!;
    const tile = board.tiles[coord.row]?.[coord.col];

    if (!tile) {
      return { ok: false, reason: "out_of_bounds" };
    }

    const key = `${coord.row}:${coord.col}`;
    if (seen.has(key)) {
      return { ok: false, reason: "reused_tile" };
    }
    seen.add(key);

    if (index > 0) {
      const previous = path[index - 1]!;
      const rowDelta = Math.abs(coord.row - previous.row);
      const colDelta = Math.abs(coord.col - previous.col);

      if (rowDelta > 1 || colDelta > 1 || (rowDelta === 0 && colDelta === 0)) {
        return { ok: false, reason: "not_adjacent" };
      }
    }

    letters.push(tile.value);
  }

  const word = letters.join("");

  return {
    ok: true,
    word,
    normalizedWord: normalizeWord(word),
    path: path.map((coord) => ({ ...coord })),
  };
}
