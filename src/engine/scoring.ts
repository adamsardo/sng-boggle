import type { AcceptedSubmission, ChallengeOutcome, ScoreLine, ScoreRoundInput } from "./types";

export function baseScore(word: string): number {
  const length = word.length;
  if (length < 3) return 0;
  return length - 2;
}

export function scoreRound(input: ScoreRoundInput): ScoreLine[] {
  const uniqueSubmissions = dedupeSubmissions(input.submissions);
  const submissionsByWord = groupBy(uniqueSubmissions, (submission) => submission.normalizedWord);
  const rejectedUniqueWords = new Set(
    (input.challenges ?? [])
      .filter((challenge) => challenge.status === "rejected")
      .map((challenge) => `${challenge.ownerPlayerId}:${challenge.normalizedWord}`),
  );

  const lines = new Map<string, ScoreLine>();
  for (const playerId of input.playerIds) {
    lines.set(playerId, {
      playerId,
      baseScore: 0,
      uniqueBonus: 0,
      challengeAdjustments: 0,
      finalScore: 0,
      acceptedWordCount: 0,
      uniqueWordCount: 0,
      longestWord: null,
    });
  }

  for (const submission of uniqueSubmissions) {
    const line = lines.get(submission.playerId);
    if (!line) continue;

    const wordScore = baseScore(submission.normalizedWord);
    const isUnique = submissionsByWord.get(submission.normalizedWord)?.length === 1;
    const rejectedUnique = rejectedUniqueWords.has(`${submission.playerId}:${submission.normalizedWord}`);

    line.baseScore += wordScore;
    line.acceptedWordCount += 1;

    if (!line.longestWord || submission.normalizedWord.length > line.longestWord.length) {
      line.longestWord = submission.normalizedWord;
    }

    if (isUnique) {
      line.uniqueWordCount += 1;
      if (rejectedUnique) {
        line.challengeAdjustments -= wordScore;
      } else {
        line.uniqueBonus += wordScore;
      }
    }
  }

  for (const line of lines.values()) {
    line.finalScore = line.baseScore + line.uniqueBonus + line.challengeAdjustments;
  }

  return [...lines.values()].sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.acceptedWordCount !== a.acceptedWordCount) return b.acceptedWordCount - a.acceptedWordCount;
    return a.playerId.localeCompare(b.playerId);
  });
}

function dedupeSubmissions(submissions: readonly AcceptedSubmission[]): AcceptedSubmission[] {
  const seen = new Set<string>();
  const result: AcceptedSubmission[] = [];

  for (const submission of submissions) {
    const key = `${submission.playerId}:${submission.normalizedWord}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(submission);
    }
  }

  return result;
}

function groupBy<T>(items: readonly T[], keyFn: (item: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    const group = grouped.get(key) ?? [];
    group.push(item);
    grouped.set(key, group);
  }

  return grouped;
}
