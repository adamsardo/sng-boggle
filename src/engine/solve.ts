import { createTrie, type TrieNode } from "./trie";
import type { Board, MinimumWordLength, TileCoord, WordDictionary } from "./types";

export type FoundWord = {
  word: string;
  path: TileCoord[];
};

export function findAllValidWords(
  board: Board,
  dictionary: WordDictionary,
  minimumWordLength: MinimumWordLength,
): Map<string, FoundWord> {
  const trie = createTrie(dictionary.words);
  const found = new Map<string, FoundWord>();

  for (const row of board.tiles) {
    for (const tile of row) {
      visitTile({
        board,
        node: trie,
        coord: { row: tile.row, col: tile.col },
        path: [],
        visited: new Set(),
        found,
        minimumWordLength,
      });
    }
  }

  return found;
}

type VisitContext = {
  board: Board;
  node: TrieNode;
  coord: TileCoord;
  path: TileCoord[];
  visited: Set<string>;
  found: Map<string, FoundWord>;
  minimumWordLength: MinimumWordLength;
};

function visitTile(context: VisitContext): void {
  const tile = context.board.tiles[context.coord.row]?.[context.coord.col];
  if (!tile) return;

  let node: TrieNode | undefined = context.node;
  for (const letter of tile.value) {
    node = node.children.get(letter);
    if (!node) return;
  }

  const key = `${tile.row}:${tile.col}`;
  if (context.visited.has(key)) return;

  const nextPath = [...context.path, { row: tile.row, col: tile.col }];
  const nextVisited = new Set(context.visited);
  nextVisited.add(key);

  if (node.word && node.word.length >= context.minimumWordLength && !context.found.has(node.word)) {
    context.found.set(node.word, { word: node.word, path: nextPath });
  }

  for (const neighbor of neighbors(context.board, tile)) {
    visitTile({
      ...context,
      node,
      coord: neighbor,
      path: nextPath,
      visited: nextVisited,
    });
  }
}

function neighbors(board: Board, coord: TileCoord): TileCoord[] {
  const result: TileCoord[] = [];

  for (let rowDelta = -1; rowDelta <= 1; rowDelta += 1) {
    for (let colDelta = -1; colDelta <= 1; colDelta += 1) {
      if (rowDelta === 0 && colDelta === 0) continue;

      const row = coord.row + rowDelta;
      const col = coord.col + colDelta;
      if (board.tiles[row]?.[col]) {
        result.push({ row, col });
      }
    }
  }

  return result;
}
