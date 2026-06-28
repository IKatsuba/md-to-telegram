import { describe, expect, it } from "vitest";
import { toTelegramHTML, toTelegramMarkdownV2 } from "../../src/index.js";

describe("spoiler directive", () => {
  it("converts ||text||", () => {
    expect(toTelegramHTML("||secret||").text).toBe("<tg-spoiler>secret</tg-spoiler>");
    expect(toTelegramMarkdownV2("||secret||").text).toBe("||secret||");
  });

  it("spans inline formatting", () => {
    expect(toTelegramHTML("||with **bold**||").text).toBe(
      "<tg-spoiler>with <b>bold</b></tg-spoiler>",
    );
  });

  it("leaves spaced || as literal text", () => {
    expect(toTelegramHTML("a || b").text).toBe("a || b");
  });
});

describe("underline directive", () => {
  it("converts ++text++", () => {
    expect(toTelegramHTML("++under++").text).toBe("<u>under</u>");
    expect(toTelegramMarkdownV2("++under++").text).toBe("__under__");
  });

  it("does not underline C++ in prose", () => {
    expect(toTelegramHTML("C++ and C++").text).toBe("C++ and C++");
  });
});

describe("directive flanking edges", () => {
  it("opens/closes a directive directly adjacent to a node", () => {
    expect(toTelegramHTML("||**b**||").text).toBe("<tg-spoiler><b>b</b></tg-spoiler>");
    expect(toTelegramHTML("++**b**++").text).toBe("<u><b>b</b></u>");
    expect(toTelegramHTML("||`c`||").text).toBe("<tg-spoiler><code>c</code></tg-spoiler>");
  });

  it("leaves consecutive and trailing markers literal", () => {
    expect(toTelegramHTML("||||").text).toBe("||||");
    expect(toTelegramHTML("a||").text).toBe("a||");
  });
});

describe("nested directives", () => {
  it("nests underline inside spoiler", () => {
    expect(toTelegramHTML("||a ++u++ b||").text).toBe("<tg-spoiler>a <u>u</u> b</tg-spoiler>");
    expect(toTelegramMarkdownV2("||a ++u++ b||").text).toBe("||a __u__ b||");
  });
});

describe("expandable blockquote directive", () => {
  it("marks a blockquote expandable and strips the marker", () => {
    const md = "> [!expandable]\n> hidden line\n> second";
    expect(toTelegramHTML(md).text).toBe("<blockquote expandable>hidden line\nsecond</blockquote>");
    expect(toTelegramMarkdownV2(md).text).toBe("**>hidden line\n>second||");
  });

  it("leaves a normal blockquote unaffected", () => {
    expect(toTelegramHTML("> [!note] hi").text).toBe("<blockquote>[!note] hi</blockquote>");
  });
});
