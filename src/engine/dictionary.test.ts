import { describe, expect, it } from "vitest";
import { createDictionary, shouldKeepDictionaryWord } from "./dictionary";

describe("dictionary filtering", () => {
  it("keeps modern lowercase alphabetic words at minimum length", () => {
    expect(shouldKeepDictionaryWord("cart")).toBe(true);
    expect(shouldKeepDictionaryWord("CAR")).toBe(true);
  });

  it("filters short, punctuated, numeric, and denylisted words", () => {
    expect(shouldKeepDictionaryWord("to")).toBe(false);
    expect(shouldKeepDictionaryWord("can't")).toBe(false);
    expect(shouldKeepDictionaryWord("r2d2")).toBe(false);
    expect(shouldKeepDictionaryWord("slur")).toBe(false);
  });

  it("creates normalized lookup sets", () => {
    const dictionary = createDictionary(["Cart", "send", "to"]);

    expect(dictionary.has("cart")).toBe(true);
    expect(dictionary.has("CART")).toBe(true);
    expect(dictionary.has("to")).toBe(false);
  });
});
