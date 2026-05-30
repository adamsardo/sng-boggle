import { createBoardFromLetters } from "../../engine/board";
import { createDictionary } from "../../engine/dictionary";
import type { TileCoord } from "../../engine/types";
import { localBoardWords } from "./localBoardWords";

export const LOCAL_PLAYER_ID = "local-player";
export const LOCAL_ROUND_DURATION_SECONDS = 45;
export const LOCAL_MINIMUM_WORD_LENGTH = 3;

export const localBoard = createBoardFromLetters("phase-2-local-fixed", [
  "c a r t",
  "s e n d",
  "l i o n",
  "m a t e",
]);

export const localDictionary = createDictionary(localBoardWords);

export type LocalHint = {
  word: string;
  path: TileCoord[];
};

export const localHints: readonly LocalHint[] = [
  {
    word: "cart",
    path: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
    ],
  },
  {
    word: "send",
    path: [
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
    ],
  },
  {
    word: "lion",
    path: [
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
      { row: 2, col: 3 },
    ],
  },
];

export function pickNextHint(foundWords: ReadonlySet<string>): LocalHint {
  return localHints.find((hint) => !foundWords.has(hint.word)) ?? localHints[0]!;
}
