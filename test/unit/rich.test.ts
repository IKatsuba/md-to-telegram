import { describe, expect, it } from "vitest";
import { toTelegramRich } from "../../src/index.js";

interface Case {
  name: string;
  md: string;
  rich: string;
}

// Rich Markdown is GFM-native, so most constructs are (near) pass-through —
// the inverse of the classic targets that approximate/drop them.
const cases: Case[] = [
  { name: "heading stays native", md: "# Heading", rich: "# Heading" },
  { name: "unordered list", md: "- a\n- b", rich: "- a\n- b" },
  { name: "ordered list", md: "1. one\n2. two", rich: "1. one\n2. two" },
  { name: "task list", md: "- [x] done\n- [ ] todo", rich: "- [x] done\n- [ ] todo" },
  { name: "nested list", md: "- a\n  - nested", rich: "- a\n  - nested" },
  { name: "blockquote", md: "> q1\n> q2", rich: "> q1\n> q2" },
  {
    name: "table with alignment",
    md: "| A | B |\n|:--|--:|\n| 1 | 2 |",
    rich: "| A | B |\n| :-- | --: |\n| 1 | 2 |",
  },
  { name: "thematic break", md: "---", rich: "---" },
  { name: "inline formatting", md: "~~s~~ **b** *i*", rich: "~~s~~ **b** *i*" },
];

describe("rich markdown — native constructs", () => {
  it.each(cases)("$name", ({ md, rich }) => {
    expect(toTelegramRich(md).text).toBe(rich);
  });

  it("never reports removed constructs", () => {
    for (const c of cases) expect(toTelegramRich(c.md).removed).toEqual([]);
    expect(toTelegramRich("# H").format).toBe("rich");
  });
});

describe("rich markdown — passes through what classic drops", () => {
  it("keeps images (with title) and reports nothing removed", () => {
    const { text, removed } = toTelegramRich('![cat](https://x/c.png "A cat")');
    expect(text).toBe('![cat](https://x/c.png "A cat")');
    expect(removed).toEqual([]);
  });

  it("keeps inline and block math", () => {
    expect(toTelegramRich("$x^2$").text).toBe("$x^2$");
    expect(toTelegramRich("$$\nE=mc^2\n$$").text).toBe("$$\nE=mc^2\n$$");
  });

  it("keeps footnotes", () => {
    expect(toTelegramRich("note[^1]\n\n[^1]: the note").text).toBe("note[^1]\n\n[^1]: the note");
  });
});

describe("rich markdown — directives", () => {
  it("keeps spoiler syntax", () => {
    expect(toTelegramRich("||secret||").text).toBe("||secret||");
  });

  it("maps underline to <u>", () => {
    expect(toTelegramRich("++under++").text).toBe("<u>under</u>");
  });
});
