import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { toTelegramHTML, toTelegramMarkdownV2 } from "../../src/index.js";

const md = readFileSync(fileURLToPath(new URL("../fixtures/canonical.md", import.meta.url)), "utf8");

describe("canonical document", () => {
  it("produces valid Telegram HTML", () => {
    const { text, removed } = toTelegramHTML(md);
    expect(text).toContain("<b>Project Setup</b>");
    expect(text).toContain("<b>md-to-telegram</b>");
    expect(text).toContain("1. Install dependencies");
    expect(text).toContain("☑ Parse CommonMark");
    expect(text).toContain("☐ Map to the target format");
    expect(text).toContain('<pre><code class="language-python">');
    expect(text).toContain('<a href="https://example.com">docs</a>');
    expect(text).toContain("<pre>Feature │ Status");
    // the inline math is the only "none" construct in this document
    expect(removed.map((r) => r.kind)).toEqual(["math"]);
  });

  it("produces valid Telegram MarkdownV2", () => {
    const { text, removed } = toTelegramMarkdownV2(md);
    expect(text).toContain("*Project Setup*");
    // hyphens are reserved in MarkdownV2 and get escaped inside the bold run
    expect(text).toContain("*md\\-to\\-telegram*");
    expect(text).toContain("```python");
    expect(text).toContain("[docs](https://example.com)");
    // the period in "That's it!" must be escaped
    expect(text).toContain("That's it\\!");
    expect(removed.map((r) => r.kind)).toEqual(["math"]);
  });
});
