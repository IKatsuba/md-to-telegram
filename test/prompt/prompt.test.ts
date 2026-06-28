import { describe, expect, it } from "vitest";
import { buildTelegramPrompt } from "../../src/index.js";

describe("prompt generation", () => {
  it("builds a system-style prompt by default", () => {
    expect(buildTelegramPrompt()).toMatch(/^You are writing a message/);
  });

  it("builds an instruction-style prompt on request", () => {
    expect(buildTelegramPrompt({ style: "instruction" })).toMatch(/^Write the message/);
  });

  it("tells the model to write standard Markdown", () => {
    expect(buildTelegramPrompt()).toMatch(/standard Markdown/i);
  });

  it("documents the Telegram-only directives", () => {
    const p = buildTelegramPrompt();
    expect(p).toContain("||"); // spoiler
    expect(p).toContain("++"); // underline
    expect(p).toContain("[!expandable]"); // expandable quote
  });

  it("lists the forbidden constructs", () => {
    const p = buildTelegramPrompt();
    expect(p).toMatch(/image/i);
    expect(p).toMatch(/math/i);
    expect(p).toMatch(/footnote/i);
    expect(p).toMatch(/HTML/i);
  });

  it("toggles the worked example", () => {
    expect(buildTelegramPrompt({ includeExamples: true })).toMatch(/Example/);
    expect(buildTelegramPrompt({ includeExamples: false })).not.toMatch(/Example/);
  });
});

describe("prompt — rich target", () => {
  it("does not forbid images/math/footnotes", () => {
    const p = buildTelegramPrompt({ target: "rich" });
    expect(p).not.toMatch(/will be removed/);
    expect(p).toMatch(/images:/i);
    expect(p).toMatch(/\$E=mc\^2\$/);
  });

  it("still documents the directives", () => {
    const p = buildTelegramPrompt({ target: "rich" });
    expect(p).toContain("||");
    expect(p).toContain("++");
    expect(p).toContain("[!expandable]");
  });

  it("classic target still forbids those constructs", () => {
    expect(buildTelegramPrompt({ target: "classic" })).toMatch(/will be removed/);
  });
});
