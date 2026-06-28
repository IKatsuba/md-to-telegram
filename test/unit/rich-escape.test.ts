import { describe, expect, it } from "vitest";
import { escapeRich } from "../../src/core/escape.js";

describe("escapeRich", () => {
  it("entity-escapes < > & in normal text", () => {
    expect(escapeRich("a < b & c > d")).toBe("a &lt; b &amp; c &gt; d");
  });

  it.each([
    ["a*b", "a\\*b"],
    ["a_b", "a\\_b"],
    ["a`b", "a\\`b"],
    ["a[b]", "a\\[b\\]"],
    ["a~b", "a\\~b"],
    ["a|b", "a\\|b"],
    ["a$b", "a\\$b"],
    ["a\\b", "a\\\\b"],
  ])("backslash-escapes active char in %s", (input, expected) => {
    expect(escapeRich(input)).toBe(expected);
  });

  it("leaves code context untouched", () => {
    expect(escapeRich("a*b`c<d", "code")).toBe("a*b`c<d");
  });

  it("escapes ) and \\ in a link URL", () => {
    expect(escapeRich("https://x/a)b", "linkUrl")).toBe("https://x/a\\)b");
  });
});
