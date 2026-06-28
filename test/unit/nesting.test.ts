import { describe, expect, it } from "vitest";
import { toTelegramHTML, toTelegramMarkdownV2 } from "../../src/index.js";

describe("nesting", () => {
  it("nests bold > italic > strike (HTML)", () => {
    expect(toTelegramHTML("**a *b ~~c~~***").text).toBe("<b>a <i>b <s>c</s></i></b>");
  });

  it("nests bold > italic > strike (MarkdownV2)", () => {
    expect(toTelegramMarkdownV2("**a *b ~~c~~***").text).toBe("*a _b ~c~_*");
  });

  it("flattens nested blockquotes to one level (HTML)", () => {
    const { text } = toTelegramHTML("> a\n> > b");
    expect(text).not.toContain("<blockquote><blockquote>");
    expect(text).toBe("<blockquote>a\nb</blockquote>");
  });

  it("flattens nested blockquotes to one level (MarkdownV2)", () => {
    const { text } = toTelegramMarkdownV2("> a\n> > b");
    expect(text).toBe(">a\n>b");
  });

  it("renders a link inside bold", () => {
    expect(toTelegramHTML("**see [docs](https://d)**").text).toBe(
      '<b>see <a href="https://d">docs</a></b>',
    );
  });
});
