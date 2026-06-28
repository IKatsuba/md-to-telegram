import { describe, expect, it } from "vitest";
import { normalizeLanguage } from "../../src/core/data/languages.js";

const ALIASES: [string, string][] = [
  ["js", "javascript"],
  ["jsx", "javascript"],
  ["cjs", "javascript"],
  ["mjs", "javascript"],
  ["ts", "typescript"],
  ["tsx", "typescript"],
  ["py", "python"],
  ["rb", "ruby"],
  ["rs", "rust"],
  ["sh", "bash"],
  ["shell", "bash"],
  ["zsh", "bash"],
  ["yml", "yaml"],
  ["md", "markdown"],
  ["c++", "cpp"],
  ["c#", "csharp"],
  ["cs", "csharp"],
  ["golang", "go"],
  ["kt", "kotlin"],
  ["ps1", "powershell"],
  ["dockerfile", "docker"],
];

describe("normalizeLanguage", () => {
  it.each(ALIASES)("maps %s -> %s", (alias, canonical) => {
    expect(normalizeLanguage(alias)).toBe(canonical);
  });

  it("passes unknown languages through (lowercased)", () => {
    expect(normalizeLanguage("python")).toBe("python");
    expect(normalizeLanguage("ruby")).toBe("ruby");
    expect(normalizeLanguage("Rust")).toBe("rust");
    expect(normalizeLanguage("HASKELL")).toBe("haskell");
  });

  it("trims and lowercases before aliasing", () => {
    expect(normalizeLanguage("  JS  ")).toBe("javascript");
    expect(normalizeLanguage("Py")).toBe("python");
  });

  it("returns undefined for empty / blank / nullish", () => {
    expect(normalizeLanguage("")).toBeUndefined();
    expect(normalizeLanguage("   ")).toBeUndefined();
    expect(normalizeLanguage(null)).toBeUndefined();
    expect(normalizeLanguage(undefined)).toBeUndefined();
  });
});
