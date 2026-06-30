import { describe, expect, it } from "vitest";
import { toTelegramRich } from "../../src/index.js";

const rich = (md: string): string => toTelegramRich(md).text;

describe("rich serialize — edges", () => {
  it("splits images out of a paragraph into their own blocks", () => {
    expect(rich("text ![x](u) tail")).toBe("text \n\n![x](u)\n\n tail");
  });

  it("widens the inline-code fence around backticks", () => {
    expect(rich("``code with ` tick``")).toBe("``code with ` tick``");
  });

  it("pads inline code that is a lone backtick", () => {
    expect(rich("`` ` ``")).toBe("`` ` ``");
  });

  it("widens the code-block fence past inner backtick runs", () => {
    expect(rich("````\n```\ninner\n```\n````")).toBe("````\n```\ninner\n```\n````");
  });

  it("escapes quotes inside a link title", () => {
    expect(rich('[t](https://x "a \\"q\\" b")')).toBe('[t](https://x "a \\"q\\" b")');
  });

  it("keeps the ordered-list start index", () => {
    expect(rich("5. five\n6. six")).toBe("5. five\n6. six");
  });

  it("pads ragged table rows to the column count", () => {
    expect(rich("| a | b | c |\n|---|---|---|\n| 1 |")).toBe(
      "| a | b | c |\n| --- | --- | --- |\n| 1 |  |  |",
    );
  });

  it("renders an unresolved reference link as escaped text", () => {
    expect(rich("[t][nope]")).toBe("\\[t\\]\\[nope\\]");
  });

  it("preserves blank lines inside a blockquote", () => {
    expect(rich("> a\n>\n> b")).toBe("> a\n>\n> b");
  });

  it("indents loose-list continuation blocks", () => {
    expect(rich("- one\n\n  para two\n\n  ```\n  code\n  ```")).toBe(
      "- one\n  para two\n  ```\n  code\n  ```",
    );
  });
});

describe("rich serialize — expandable blockquote", () => {
  it("renders an expandable quote as a collapsible <details>", () => {
    expect(rich("> [!expandable]\n> secret\n> two")).toBe(
      "<details><summary>Details</summary>\n\n> secret\n> two\n\n</details>",
    );
  });

  it("uses a custom summary label", () => {
    expect(toTelegramRich("> [!expandable]\n> x", { expandableSummary: "Spoiler" }).text).toBe(
      "<details><summary>Spoiler</summary>\n\n> x\n\n</details>",
    );
  });

  it("leaves a normal blockquote as a plain quote", () => {
    expect(rich("> normal")).toBe("> normal");
  });
});
