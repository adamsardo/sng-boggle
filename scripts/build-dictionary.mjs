import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import wordListPath from "word-list";

const outputPath = path.join("data", "dictionaries", "en-clean.json");
const denylist = new Set(["arse", "damn", "hell", "slur"]);
const modernWordPattern = /^[a-z]+$/;

function normalizeWord(word) {
  return word.trim().toLowerCase();
}

function shouldKeep(word) {
  const normalized = normalizeWord(word);
  if (normalized.length < 3) return false;
  if (!modernWordPattern.test(normalized)) return false;
  if (denylist.has(normalized)) return false;
  return true;
}

const raw = await readFile(wordListPath, "utf8");
const words = [...new Set(raw.split(/\r?\n/).filter(shouldKeep).map(normalizeWord))].sort();

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify(
    {
      source: {
        package: "word-list",
        license: "MIT",
        repository: "https://github.com/sindresorhus/word-list",
      },
      generatedAt: new Date().toISOString(),
      filter: {
        minLength: 3,
        alphabeticLowercaseOnly: true,
        denylistSize: denylist.size,
      },
      words,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${words.length} words to ${outputPath}`);
