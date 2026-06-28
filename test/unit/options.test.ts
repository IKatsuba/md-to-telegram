import { describe, expect, it } from "vitest";
import { convert, toTelegramHTML, toTelegramMarkdownV2 } from "../../src/index.js";

describe("options", () => {
  it("drops tables when tables: 'remove'", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |";
    expect(toTelegramHTML(md, { tables: "remove" }).text).toBe("");
  });

  it("supports a custom thematic break string", () => {
    expect(toTelegramHTML("---", { thematicBreak: "***" }).text).toBe("***");
  });

  it("renders a blank thematic break", () => {
    expect(toTelegramHTML("a\n\n---\n\nb", { thematicBreak: "blank" }).text).toBe("a\n\nb");
  });

  it("respects a custom list indent", () => {
    expect(toTelegramHTML("- a\n  - b", { listIndent: 2 }).text).toBe("• a\n  • b");
  });

  it("appends footnotes when footnotes: 'append'", () => {
    const { text } = toTelegramHTML("a[^1]\n\n[^1]: note", { footnotes: "append" });
    expect(text).toContain("note");
    expect(text).toContain("[1]");
  });

  it("inlines footnotes when footnotes: 'inline'", () => {
    const { text } = toTelegramMarkdownV2("a[^1]\n\n[^1]: note", { footnotes: "inline" });
    expect(text).toContain("note");
  });

  it("convert() requires an explicit format", () => {
    expect(convert("**x**", { format: "markdownv2" }).text).toBe("*x*");
  });
});
