import { describe, expect, it } from "vitest";
import { validateRichMarkdown } from "../../src/index.js";

const paragraphs = (n: number): string =>
  Array.from({ length: n }, (_, i) => `p${i}`).join("\n\n");
const table = (cols: number): string => {
  const row = Array.from({ length: cols }, () => "c").join("|");
  const delim = Array.from({ length: cols }, () => "-").join("|");
  return `|${row}|\n|${delim}|\n|${row}|`;
};
const images = (n: number): string =>
  Array.from({ length: n }, (_, i) => `![](u${i})`).join("\n\n");
const nestedQuote = (depth: number): string => `${">".repeat(depth)} x`;

const kinds = (md: string): string[] => validateRichMarkdown(md).map((w) => w.kind);

describe("validateRichMarkdown — within limits", () => {
  it("returns no warnings for ordinary content", () => {
    expect(validateRichMarkdown("# Title\n\n- a\n- b")).toEqual([]);
  });
});

describe("validateRichMarkdown — boundaries (exactly at limit is OK, +1 warns)", () => {
  it("length 32768 ok, 32769 warns", () => {
    expect(kinds("x".repeat(32768))).toEqual([]);
    expect(kinds("x".repeat(32769))).toEqual(["length"]);
  });

  it("blocks 500 ok, 501 warns", () => {
    expect(kinds(paragraphs(500))).toEqual([]);
    expect(kinds(paragraphs(501))).toEqual(["blocks"]);
  });

  it("columns 20 ok, 21 warns", () => {
    expect(kinds(table(20))).toEqual([]);
    expect(kinds(table(21))).toEqual(["columns"]);
  });

  it("media 50 ok, 51 warns", () => {
    expect(kinds(images(50))).toEqual([]);
    expect(kinds(images(51))).toEqual(["media"]);
  });

  it("nesting 16 ok, 17 warns", () => {
    expect(kinds(nestedQuote(16))).toEqual([]);
    expect(kinds(nestedQuote(17))).toEqual(["nesting"]);
  });
});

const repeatBlock = (snippet: string, n: number): string =>
  Array.from({ length: n }, () => snippet).join("\n\n");

describe("validateRichMarkdown — every block type is counted", () => {
  // Counts tuned so removing the type from the block set drops below the 500 limit.
  it.each([
    ["heading", "# h", 501],
    ["code", "```\nx\n```", 501],
    ["math", "$$\nx\n$$", 501],
    ["thematicBreak", "---", 501],
    ["blockquote", "> q", 251],
    ["table + tableRow", "| a |\n|---|\n| 1 |", 167],
  ])("counts %s toward the block limit", (_name, snippet, n) => {
    expect(kinds(repeatBlock(snippet, n))).toContain("blocks");
  });

  it("counts footnote definitions", () => {
    const md = Array.from({ length: 251 }, (_, i) => `[^f${i}]: x`).join("\n\n");
    expect(kinds(md)).toContain("blocks");
  });

  it("counts image references as media", () => {
    const md = `${Array.from({ length: 51 }, () => "![a][id]").join("\n\n")}\n\n[id]: u`;
    expect(kinds(md)).toContain("media");
  });
});

describe("validateRichMarkdown — warning payload", () => {
  it("reports exact limit, actual, and a message with the numbers", () => {
    const [w] = validateRichMarkdown("x".repeat(40000));
    expect(w).toEqual({
      kind: "length",
      limit: 32768,
      actual: 40000,
      message: "rich message text is too long (40000 > 32768)",
    });
  });

  it("formats each warning kind's message", () => {
    const msg = (md: string, kind: string): string | undefined =>
      validateRichMarkdown(md).find((w) => w.kind === kind)?.message;
    expect(msg(repeatBlock("# h", 501), "blocks")).toBe("too many blocks (501 > 500)");
    expect(msg(nestedQuote(17), "nesting")).toBe("blocks nested too deeply (17 > 16)");
    expect(msg(repeatBlock("![](u)", 51), "media")).toBe("too many media attachments (51 > 50)");
    expect(msg(table(21), "columns")).toBe("a table has too many columns (21 > 20)");
  });
});
