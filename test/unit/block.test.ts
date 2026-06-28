import { describe, expect, it } from "vitest";
import { toTelegramHTML, toTelegramMarkdownV2 } from "../../src/index.js";
import { blockCases } from "../fixtures/mapping.js";

describe("block constructs", () => {
  it.each(blockCases)("HTML: $name", ({ md, html }) => {
    expect(toTelegramHTML(md).text).toBe(html);
  });

  it.each(blockCases)("MarkdownV2: $name", ({ md, mdv2 }) => {
    expect(toTelegramMarkdownV2(md).text).toBe(mdv2);
  });

  it("renders ordered lists from their start index", () => {
    expect(toTelegramHTML("3. three\n4. four").text).toBe("3. three\n4. four");
  });

  it("renders a GFM table as a fixed-width block", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |";
    expect(toTelegramHTML(md).text).toBe("<pre>A │ B\n──┼──\n1 │ 2</pre>");
    expect(toTelegramMarkdownV2(md).text).toBe("```\nA │ B\n──┼──\n1 │ 2\n```");
  });

  it("nests sublists with indentation", () => {
    const { text } = toTelegramHTML("- a\n  - b");
    expect(text).toBe("• a\n   • b");
  });

  it("separates top-level blocks with a blank line", () => {
    expect(toTelegramHTML("# H\n\ntext").text).toBe("<b>H</b>\n\ntext");
  });
});
