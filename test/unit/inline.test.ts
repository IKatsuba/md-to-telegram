import { describe, expect, it } from "vitest";
import { toTelegramHTML, toTelegramMarkdownV2 } from "../../src/index.js";
import { inlineCases } from "../fixtures/mapping.js";

describe("inline constructs", () => {
  it.each(inlineCases)("HTML: $name", ({ md, html }) => {
    expect(toTelegramHTML(md).text).toBe(html);
  });

  it.each(inlineCases)("MarkdownV2: $name", ({ md, mdv2 }) => {
    expect(toTelegramMarkdownV2(md).text).toBe(mdv2);
  });

  it("echoes the requested format", () => {
    expect(toTelegramHTML("x").format).toBe("html");
    expect(toTelegramMarkdownV2("x").format).toBe("markdownv2");
  });
});
