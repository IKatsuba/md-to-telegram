import { describe, expect, it } from "vitest";
import {
  buildTelegramPrompt,
  convert,
  toTelegramHTML,
  toTelegramMarkdownV2,
  toTelegramRich,
  validateRichMarkdown,
  type TelegramFormat,
} from "../../src/index.js";
import { allCases } from "./corpus.js";
import { MDV2_ESCAPABLE, noDanglingEscape, validateTelegramHtml } from "./invariants.js";

const cases = allCases();
const FORMATS: TelegramFormat[] = ["html", "markdownv2", "rich"];

describe("robustness — never throws, always returns a valid shape", () => {
  it.each(cases)("$name", ({ md }) => {
    for (const format of FORMATS) {
      const res = convert(md, { format });
      expect(typeof res.text).toBe("string");
      expect(res.format).toBe(format);
      expect(Array.isArray(res.removed)).toBe(true);
    }
    expect(Array.isArray(validateRichMarkdown(md))).toBe(true);
  });
});

describe("HTML output is always well-formed Telegram HTML", () => {
  it.each(cases)("$name", ({ md }) => {
    const { text } = toTelegramHTML(md);
    const check = validateTelegramHtml(text);
    expect(
      check.ok,
      `${check.error}\n  INPUT=${JSON.stringify(md)}\n  OUTPUT=${JSON.stringify(text)}`,
    ).toBe(true);
  });
});

describe("MarkdownV2 output has no dangling escapes", () => {
  it.each(cases)("$name", ({ md }) => {
    const { text } = toTelegramMarkdownV2(md);
    const check = noDanglingEscape(text, MDV2_ESCAPABLE);
    expect(check.ok, `${check.error}\n  INPUT=${JSON.stringify(md)}\n  OUTPUT=${JSON.stringify(text)}`).toBe(
      true,
    );
  });
});

describe("rich output: removed is always empty", () => {
  // Note: rich passes math/code through verbatim, so the whole-output dangling-escape
  // check doesn't apply — escapeRich itself is fuzzed precisely in escape-fuzz.test.ts.
  it.each(cases)("$name", ({ md }) => {
    expect(toTelegramRich(md).removed).toEqual([]);
  });
});

describe("conversions are deterministic and independent", () => {
  it.each(cases)("$name", ({ md }) => {
    const h1 = toTelegramHTML(md).text;
    // interleave the other formats to surface any cross-call AST mutation
    toTelegramMarkdownV2(md);
    toTelegramRich(md);
    const h2 = toTelegramHTML(md).text;
    expect(h2).toBe(h1);
  });
});

describe("prompt generation never throws", () => {
  it.each([
    { target: "classic" as const },
    { target: "rich" as const },
  ])("target $target", (opts) => {
    expect(typeof buildTelegramPrompt(opts)).toBe("string");
    expect(typeof buildTelegramPrompt({ ...opts, includeExamples: false })).toBe("string");
    expect(typeof buildTelegramPrompt({ ...opts, style: "instruction" })).toBe("string");
  });
});
