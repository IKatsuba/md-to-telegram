import { describe, expect, it } from "vitest";
import { measureWidth } from "../../src/core/indirect/width.js";
import { htmlRenderer } from "../../src/core/renderers/html.js";
import { markdownV2Renderer } from "../../src/core/renderers/markdownv2.js";
import { toTelegramHTML, toTelegramMarkdownV2 } from "../../src/index.js";

describe("additional construct coverage", () => {
  it("renders hard line breaks as newlines", () => {
    expect(toTelegramHTML("a  \nb").text).toBe("a\nb");
    expect(toTelegramMarkdownV2("a  \nb").text).toBe("a\nb");
  });

  it("resolves reference-style links", () => {
    expect(toTelegramHTML("[t][id]\n\n[id]: https://x").text).toBe('<a href="https://x">t</a>');
  });

  it("resolves and reports reference-style images", () => {
    const { text, removed } = toTelegramHTML("![alt][id]\n\n[id]: https://x");
    expect(text).toBe("");
    expect(removed[0]).toMatchObject({ kind: "image", url: "https://x", alt: "alt" });
  });

  it("reports block-level HTML with scope 'block'", () => {
    const { removed } = toTelegramHTML("<div>x</div>");
    expect(removed[0]).toMatchObject({ kind: "html", scope: "block", tagName: "div" });
  });

  it("reports HTML with no parseable tag name", () => {
    const { removed } = toTelegramHTML("<!-- hi -->");
    expect(removed[0]?.kind).toBe("html");
    expect(removed[0]?.kind === "html" && removed[0].tagName).toBeUndefined();
  });

  it("renders setext headings as bold", () => {
    expect(toTelegramHTML("Title\n=====").text).toBe("<b>Title</b>");
  });

  it("keeps block math raw when math: 'raw'", () => {
    expect(toTelegramHTML("$$\nx\n$$", { math: "raw" }).text).toBe("<pre>x</pre>");
    expect(toTelegramMarkdownV2("$$\nx\n$$", { math: "raw" }).text).toBe("```\nx\n```");
  });

  it("aligns table columns (left/center/right)", () => {
    const md = "| a | b | c |\n|:--|:-:|--:|\n| 1 | 2 | 3 |";
    expect(toTelegramMarkdownV2(md).text).toBe("```\na │ b │ c\n──┼───┼──\n1 │ 2 │ 3\n```");
  });

  it("keeps nested blockquotes when flattenBlockquotes is false", () => {
    expect(toTelegramHTML("> a\n> > b", { flattenBlockquotes: false }).text).toBe(
      "<blockquote>a\n<blockquote>b</blockquote></blockquote>",
    );
  });

  it("uses the URL as link text for an image with empty alt", () => {
    expect(toTelegramHTML("![](https://x/y.png)", { images: "link" }).text).toBe(
      '<a href="https://x/y.png">https://x/y.png</a>',
    );
  });

  it("renders loose list items with continuation lines", () => {
    expect(toTelegramHTML("- a\n\n  more\n- b").text).toBe("• a\n   more\n• b");
  });
});

describe("width measurement", () => {
  it("counts narrow, wide, and zero-width characters", () => {
    expect(measureWidth("abc")).toBe(3);
    expect(measureWidth("中文")).toBe(4); // CJK = 2 each
    expect(measureWidth("\u{1f600}")).toBe(2); // emoji = 2
    expect(measureWidth("Ａ")).toBe(2); // fullwidth A = 2
    expect(measureWidth("é")).toBe(1); // base + combining mark (0)
    expect(measureWidth("a‍b")).toBe(2); // ZWJ = 0
    expect(measureWidth("a️b")).toBe(2); // variation selector = 0
  });
});

describe("renderer expandable blockquotes (direct)", () => {
  it("HTML adds the expandable attribute", () => {
    expect(htmlRenderer.blockquote("x", true)).toBe("<blockquote expandable>x</blockquote>");
  });

  it("MarkdownV2 uses the empty-bold separator and || mark", () => {
    expect(markdownV2Renderer.blockquote("a\nb", true)).toBe("**>a\n>b||");
  });
});
