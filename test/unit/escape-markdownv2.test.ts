import { describe, expect, it } from "vitest";
import { MARKDOWNV2_RESERVED, escapeMarkdownV2 } from "../../src/core/escape.js";
import { toTelegramMarkdownV2 } from "../../src/index.js";

describe("MarkdownV2 escaping (unit)", () => {
  it.each(MARKDOWNV2_RESERVED)("escapes %s in normal text", (ch) => {
    expect(escapeMarkdownV2(`a${ch}b`)).toBe(`a\\${ch}b`);
  });

  it("escapes the backslash itself in normal text", () => {
    expect(escapeMarkdownV2("a\\b")).toBe("a\\\\b");
  });

  it("inside code: escapes only ` and \\", () => {
    expect(escapeMarkdownV2("a.b-c!", "code")).toBe("a.b-c!");
    expect(escapeMarkdownV2("a`b\\c", "code")).toBe("a\\`b\\\\c");
  });

  it("inside link target: escapes only ) and \\", () => {
    expect(escapeMarkdownV2("a.b(c)", "linkUrl")).toBe("a.b(c\\)");
    expect(escapeMarkdownV2("a\\b", "linkUrl")).toBe("a\\\\b");
  });
});

describe("MarkdownV2 escaping (end-to-end)", () => {
  it("escapes reserved characters in message text", () => {
    expect(toTelegramMarkdownV2("a.b! (x)").text).toBe("a\\.b\\! \\(x\\)");
  });

  it("never emits __ as underline for bold source", () => {
    expect(toTelegramMarkdownV2("__bold__").text).toBe("*bold*");
  });

  it("does not escape the dot inside inline code", () => {
    expect(toTelegramMarkdownV2("`a.b`").text).toBe("`a.b`");
  });
});
