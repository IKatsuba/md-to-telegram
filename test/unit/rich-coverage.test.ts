import { describe, expect, it } from "vitest";
import { toTelegramRich } from "../../src/index.js";

describe("rich markdown — additional coverage", () => {
  it("keeps link titles", () => {
    expect(toTelegramRich('[t](https://x "ti")').text).toBe('[t](https://x "ti")');
  });

  it("resolves reference links", () => {
    expect(toTelegramRich("[t][id]\n\n[id]: https://x").text).toBe("[t](https://x)");
  });

  it("resolves reference images", () => {
    expect(toTelegramRich("![a][id]\n\n[id]: https://i/p.png").text).toBe("![a](https://i/p.png)");
  });

  it("emits inline code, widening the fence when needed", () => {
    expect(toTelegramRich("`code`").text).toBe("`code`");
    expect(toTelegramRich("``has ` tick``").text).toBe("``has ` tick``");
  });

  it("renders a hard line break", () => {
    expect(toTelegramRich("a  \nb").text).toBe("a\\\nb");
  });

  it("passes raw HTML through", () => {
    expect(toTelegramRich("<div>raw</div>").text).toBe("<div>raw</div>");
  });

  it("renders loose list item continuations", () => {
    expect(toTelegramRich("- a\n\n  more\n- b").text).toBe("- a\n  more\n- b");
  });

  it("strips the expandable marker (v1: normal quote)", () => {
    expect(toTelegramRich("> [!expandable]\n> hidden").text).toBe("> hidden");
  });

  it("renders inline formatting inside headings", () => {
    expect(toTelegramRich("## Q1 _italic_").text).toBe("## Q1 *italic*");
  });
});
