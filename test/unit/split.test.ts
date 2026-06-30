import { describe, expect, it } from "vitest";
import { splitMessage, toTelegramHTML, toTelegramMarkdownV2, toTelegramRich } from "../../src/index.js";
import { MDV2_ESCAPABLE, noDanglingEscape, validateTelegramHtml } from "../fuzz/invariants.js";

const everyAtMost = (parts: string[], max: number): boolean => parts.every((p) => p.length <= max);

describe("splitMessage", () => {
  it("returns the text unchanged when it already fits", () => {
    expect(splitMessage("hello", { format: "html" })).toEqual(["hello"]);
    expect(splitMessage("a\n\nb", { format: "markdownv2", maxLength: 10 })).toEqual(["a\n\nb"]);
  });

  it("packs blocks on \\n\\n and reconstructs the original", () => {
    const doc = Array.from({ length: 40 }, (_, i) => `Paragraph ${i} with **bold ${i}**.`).join(
      "\n\n",
    );
    const html = toTelegramHTML(doc).text;
    const parts = splitMessage(html, { format: "html", maxLength: 400 });
    expect(parts.length).toBeGreaterThan(1);
    expect(everyAtMost(parts, 400)).toBe(true);
    expect(parts.every((p) => validateTelegramHtml(p).ok)).toBe(true);
    expect(parts.join("\n\n")).toBe(html);
  });

  it("splits an oversized code block, re-wrapping and keeping the language", () => {
    const src = `\`\`\`js\n${Array.from({ length: 150 }, (_, i) => `const x${i} = ${i};`).join("\n")}\n\`\`\``;
    const html = toTelegramHTML(src).text;
    const parts = splitMessage(html, { format: "html", maxLength: 300 });
    expect(parts.length).toBeGreaterThan(1);
    expect(everyAtMost(parts, 300)).toBe(true);
    expect(parts.every((p) => validateTelegramHtml(p).ok)).toBe(true);
    expect(parts.every((p) => p.includes('class="language-javascript"'))).toBe(true);
  });

  it("rebalances HTML tags across a long formatted paragraph", () => {
    const md = `**${"word ".repeat(300)}[link](https://x)**`;
    const parts = splitMessage(toTelegramHTML(md).text, { format: "html", maxLength: 200 });
    expect(parts.length).toBeGreaterThan(1);
    expect(everyAtMost(parts, 200)).toBe(true);
    expect(parts.every((p) => validateTelegramHtml(p).ok)).toBe(true);
  });

  it("rebalances MarkdownV2 marks across a long paragraph", () => {
    const md = `**${"word ".repeat(300)}done**`; // closing ** must not follow a space
    const parts = splitMessage(toTelegramMarkdownV2(md).text, { format: "markdownv2", maxLength: 200 });
    expect(parts.length).toBeGreaterThan(1);
    expect(everyAtMost(parts, 200)).toBe(true);
    expect(parts.every((p) => noDanglingEscape(p, MDV2_ESCAPABLE).ok)).toBe(true);
    // bold reopened/closed: every part starts and ends with the bold mark
    expect(parts.every((p) => p.startsWith("*") && p.endsWith("*"))).toBe(true);
  });

  it("rebalances MarkdownV2 italic and inline code across a long run", () => {
    const word = "word ".repeat(200);
    const italic = splitMessage(toTelegramMarkdownV2(`*${word}done*`).text, {
      format: "markdownv2",
      maxLength: 150,
    });
    expect(italic.length).toBeGreaterThan(1);
    expect(everyAtMost(italic, 150)).toBe(true);
    expect(italic.every((p) => p.startsWith("_") && p.endsWith("_"))).toBe(true);

    const code = splitMessage(toTelegramMarkdownV2(`\`${word}end\``).text, {
      format: "markdownv2",
      maxLength: 150,
    });
    expect(everyAtMost(code, 150)).toBe(true);
    expect(code.every((p) => p.startsWith("`") && p.endsWith("`"))).toBe(true);
  });

  it("rebalances a rich <u> underline across a long run", () => {
    const parts = splitMessage(toTelegramRich(`++${"word ".repeat(200)}done++`).text, {
      format: "rich",
      maxLength: 150,
    });
    expect(parts.length).toBeGreaterThan(1);
    expect(everyAtMost(parts, 150)).toBe(true);
    expect(parts.every((p) => p.startsWith("<u>") && p.endsWith("</u>"))).toBe(true);
  });

  it("splits oversized rich content", () => {
    const md = `# Heading\n\n${"sentence ".repeat(2000)}`;
    const parts = splitMessage(toTelegramRich(md).text, { format: "rich", maxLength: 1000 });
    expect(parts.length).toBeGreaterThan(1);
    expect(everyAtMost(parts, 1000)).toBe(true);
  });

  it("hard-splits a whitespace-free run and reconstructs it", () => {
    const blob = "x".repeat(1000);
    const parts = splitMessage(toTelegramHTML(blob).text, { format: "html", maxLength: 100 });
    expect(everyAtMost(parts, 100)).toBe(true);
    expect(parts.join("")).toBe(blob);
  });

  it("uses format-specific default limits (4096 vs 32768)", () => {
    const doc = Array.from({ length: 200 }, (_, i) => `line ${i} with a bit more filler text to add length`).join("\n\n");
    const html = toTelegramHTML(doc).text; // ~10k chars, over 4096
    expect(splitMessage(html, { format: "html" }).length).toBeGreaterThan(1);
    expect(splitMessage(toTelegramRich(doc).text, { format: "rich" }).length).toBe(1);
  });
});
