import { validatePath } from "./path";
import type {
  AcceptedSubmission,
  SubmissionInput,
  SubmissionValidationContext,
  SubmissionValidationResult,
} from "./types";

export function validateSubmission(
  input: SubmissionInput,
  context: SubmissionValidationContext,
): SubmissionValidationResult {
  if (input.submittedAtMs > context.roundEndsAtMs) {
    return { accepted: false, reason: "round_ended" };
  }

  const pathResult = validatePath(context.board, input.path);
  if (!pathResult.ok) {
    return { accepted: false, reason: "invalid_path", pathReason: pathResult.reason };
  }

  if (pathResult.normalizedWord.length < context.minimumWordLength) {
    return { accepted: false, reason: "too_short", word: pathResult.normalizedWord };
  }

  if (!context.dictionary.has(pathResult.normalizedWord)) {
    return { accepted: false, reason: "not_in_word_list", word: pathResult.normalizedWord };
  }

  const duplicate = context.priorAcceptedSubmissions.some(
    (submission) =>
      submission.playerId === input.playerId &&
      submission.normalizedWord === pathResult.normalizedWord,
  );

  if (duplicate) {
    return { accepted: false, reason: "duplicate", word: pathResult.normalizedWord };
  }

  const submission: AcceptedSubmission = {
    playerId: input.playerId,
    word: pathResult.word,
    normalizedWord: pathResult.normalizedWord,
    path: pathResult.path,
    submittedAtMs: input.submittedAtMs,
  };

  return { accepted: true, submission };
}
