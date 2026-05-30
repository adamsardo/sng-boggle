import type { DictionaryFilterOptions, WordDictionary } from "./types";

export const DEFAULT_DENYLIST = new Set([
  "arse",
  "damn",
  "hell",
  "slur",
]);

const MODERN_WORD_PATTERN = /^[a-z]+$/;

export function normalizeWord(word: string): string {
  return word.trim().toLowerCase().replaceAll("qu", "qu");
}

export function shouldKeepDictionaryWord(
  word: string,
  options: DictionaryFilterOptions = {},
): boolean {
  const normalized = normalizeWord(word);
  const minLength = options.minLength ?? 3;
  const denylist = options.denylist ?? DEFAULT_DENYLIST;

  if (normalized.length < minLength) return false;
  if (!MODERN_WORD_PATTERN.test(normalized)) return false;
  if (denylist.has(normalized)) return false;

  return true;
}

export function createDictionary(
  words: Iterable<string>,
  options: DictionaryFilterOptions = {},
): WordDictionary {
  const normalizedWords = new Set<string>();

  for (const word of words) {
    if (shouldKeepDictionaryWord(word, options)) {
      normalizedWords.add(normalizeWord(word));
    }
  }

  return {
    words: normalizedWords,
    has(word: string) {
      return normalizedWords.has(normalizeWord(word));
    },
  };
}
