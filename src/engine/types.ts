export type GridSize = 4 | 5 | 6;
export type MinimumWordLength = 3 | 4 | 5;

export type TileCoord = {
  row: number;
  col: number;
};

export type LetterTile = TileCoord & {
  id: string;
  display: string;
  value: string;
};

export type Board = {
  seed: string;
  gridSize: GridSize;
  tiles: LetterTile[][];
};

export type GenerateBoardOptions = {
  seed: string;
  gridSize: GridSize;
};

export type RoundSettings = {
  gridSize: GridSize;
  durationSeconds: 30 | 60 | 90 | 120 | 180;
  minimumWordLength: MinimumWordLength;
  hintsEnabled: boolean;
  wordChallengeEnabled: boolean;
};

export type PathValidationResult =
  | {
      ok: true;
      word: string;
      normalizedWord: string;
      path: TileCoord[];
    }
  | {
      ok: false;
      reason: "empty_path" | "out_of_bounds" | "reused_tile" | "not_adjacent";
    };

export type DictionaryFilterOptions = {
  minLength?: number;
  denylist?: ReadonlySet<string>;
};

export type WordDictionary = {
  words: ReadonlySet<string>;
  has(word: string): boolean;
};

export type SubmissionInput = {
  playerId: string;
  path: TileCoord[];
  submittedAtMs: number;
};

export type AcceptedSubmission = {
  playerId: string;
  word: string;
  normalizedWord: string;
  path: TileCoord[];
  submittedAtMs: number;
};

export type SubmissionValidationContext = {
  board: Board;
  dictionary: WordDictionary;
  minimumWordLength: MinimumWordLength;
  roundEndsAtMs: number;
  priorAcceptedSubmissions: readonly AcceptedSubmission[];
};

export type SubmissionValidationResult =
  | {
      accepted: true;
      submission: AcceptedSubmission;
    }
  | {
      accepted: false;
      reason:
        | "round_ended"
        | "invalid_path"
        | "too_short"
        | "not_in_word_list"
        | "duplicate";
      pathReason?: Exclude<PathValidationResult, { ok: true }>["reason"];
      word?: string;
    };

export type ChallengeOutcome = {
  normalizedWord: string;
  ownerPlayerId: string;
  status: "accepted" | "rejected";
};

export type ScoreLine = {
  playerId: string;
  baseScore: number;
  uniqueBonus: number;
  challengeAdjustments: number;
  finalScore: number;
  acceptedWordCount: number;
  uniqueWordCount: number;
  longestWord: string | null;
};

export type ScoreRoundInput = {
  playerIds: readonly string[];
  submissions: readonly AcceptedSubmission[];
  challenges?: readonly ChallengeOutcome[];
};
