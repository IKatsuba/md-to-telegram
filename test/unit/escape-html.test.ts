import { describe, expect, it } from "vitest";
import { escapeHtml } from "../../src/core/escape.js";
import { toTelegramHTML } from "../../src/index.js";

describe("HTML escaping (unit)", () => {
  it("escapes & < > in normal text", () => {
    expect(escapeHtml("a & b < c > d")).toBe("a &amp; b &lt; c &gt; d");
  });

  it('escapes & < > and " in a link URL', () => {
    expect(escapeHtml('https://x?a="b"&c<d', "linkUrl")).toBe(
      "https://x?a=&quot;b&quot;&amp;c&lt;d",
    );
  });

  it("does not double-escape", () => {
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });
});

describe("HTML escaping (end-to-end)", () => {
  it("escapes & < > in message text", () => {
    expect(toTelegramHTML("a & b < c > d").text).toBe("a &amp; b &lt; c &gt; d");
  });

  it("escapes the href attribute", () => {
    expect(toTelegramHTML('[t](https://x?a=1&b=2)').text).toBe(
      '<a href="https://x?a=1&amp;b=2">t</a>',
    );
  });
});
