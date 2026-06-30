import { describe, expect, it } from "vitest";
import { splitMessage, toTelegramMarkdownV2, toTelegramRich } from "../../src/index.js";

const fits = (parts: string[], max: number): boolean => parts.every((p) => p.length <= max);

describe("splitMessage — additional coverage", () => {
  it("splits a MarkdownV2 fenced code block, keeping the fence + language", () => {
    const src = `\`\`\`python\n${Array.from({ length: 120 }, (_, i) => `x${i} = ${i}`).join("\n")}\n\`\`\``;
    const parts = splitMessage(toTelegramMarkdownV2(src).text, { format: "markdownv2", maxLength: 200 });
    expect(parts.length).toBeGreaterThan(1);
    expect(fits(parts, 200)).toBe(true);
    expect(parts.every((p) => p.startsWith("```python") && p.endsWith("```"))).toBe(true);
  });

  it("splits a rich fenced code block", () => {
    const src = `\`\`\`\n${Array.from({ length: 120 }, (_, i) => `line ${i}`).join("\n")}\n\`\`\``;
    const parts = splitMessage(toTelegramRich(src).text, { format: "rich", maxLength: 150 });
    expect(parts.length).toBeGreaterThan(1);
    expect(fits(parts, 150)).toBe(true);
    expect(parts.every((p) => p.startsWith("```") && p.endsWith("```"))).toBe(true);
  });

  it("rejoins escaped (mark-free) MarkdownV2 text exactly", () => {
    const text = toTelegramMarkdownV2("Sentence. ".repeat(80)).text; // escaped dots, no marks
    const parts = splitMessage(text, { format: "markdownv2", maxLength: 120 });
    expect(parts.length).toBeGreaterThan(1);
    expect(fits(parts, 120)).toBe(true);
    expect(parts.join("")).toBe(text);
  });

  it("packs many small blocks and reconstructs them", () => {
    const doc = Array.from({ length: 30 }, (_, i) => `b${i}`).join("\n\n");
    const parts = splitMessage(doc, { format: "html", maxLength: 20 });
    expect(parts.length).toBeGreaterThan(1);
    expect(fits(parts, 20)).toBe(true);
    expect(parts.join("\n\n")).toBe(doc);
  });

  it("force-progresses past a tiny limit without dropping characters", () => {
    const parts = splitMessage("abcdefghij", { format: "html", maxLength: 3 });
    expect(fits(parts, 3)).toBe(true);
    expect(parts.join("")).toBe("abcdefghij");
  });

  it("does not crash when the limit is smaller than a code-block wrapper", () => {
    const text = toTelegramMarkdownV2(`\`\`\`\n${"x".repeat(50)}\n\`\`\``).text;
    expect(splitMessage(text, { format: "markdownv2", maxLength: 6 }).length).toBeGreaterThan(0);
  });
});

// Exact-output cases pin the packing/break/rebalance arithmetic precisely.
describe("splitMessage — exact output", () => {
  it("packs blocks greedily", () => {
    expect(splitMessage("aaa\n\nbbb\n\nccc", { format: "html", maxLength: 8 })).toEqual([
      "aaa\n\nbbb",
      "ccc",
    ]);
  });

  it("rebalances an HTML bold run at each seam", () => {
    expect(splitMessage("<b>aa bb cc</b>", { format: "html", maxLength: 11 })).toEqual([
      "<b>aa </b>",
      "<b>bb </b>",
      "<b>cc</b>",
    ]);
  });

  it("rebalances a MarkdownV2 bold run at each seam", () => {
    expect(splitMessage("*aa bb cc*", { format: "markdownv2", maxLength: 8 })).toEqual([
      "*aa bb *",
      "*cc*",
    ]);
  });

  it("re-wraps an HTML <pre> code block per line", () => {
    expect(splitMessage("<pre>line1\nline2\nline3</pre>", { format: "html", maxLength: 18 })).toEqual([
      "<pre>line1</pre>",
      "<pre>line2</pre>",
      "<pre>line3</pre>",
    ]);
  });

  it("re-wraps a MarkdownV2 fenced code block per line", () => {
    expect(splitMessage("```js\nA\nB\nC\n```", { format: "markdownv2", maxLength: 12 })).toEqual([
      "```js\nA\n```",
      "```js\nB\n```",
      "```js\nC\n```",
    ]);
  });
});
