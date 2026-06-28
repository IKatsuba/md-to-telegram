import { describe, expect, it } from "vitest";
import {
  buildTelegramPrompt,
  telegramHtmlPrompt,
  telegramMarkdownV2Prompt,
} from "../../src/index.js";
import { MARKDOWNV2_RESERVED } from "../../src/core/escape.js";

describe("prompt generation", () => {
  it("builds a system-style prompt by default", () => {
    expect(telegramHtmlPrompt()).toMatch(/^You are formatting a message for Telegram/);
  });

  it("builds an instruction-style prompt on request", () => {
    expect(telegramHtmlPrompt({ style: "instruction" })).toMatch(/^When you write the message/);
  });

  it("MarkdownV2 prompt mentions every reserved character", () => {
    const p = buildTelegramPrompt({ format: "markdownv2" });
    for (const ch of MARKDOWNV2_RESERVED) {
      expect(p).toContain(ch);
    }
  });

  it("MarkdownV2 prompt warns about the __ underline trap", () => {
    expect(buildTelegramPrompt({ format: "markdownv2" })).toMatch(/UNDERLINE/);
  });

  it("HTML prompt names the four allowed named entities", () => {
    const p = buildTelegramPrompt({ format: "html" });
    for (const ent of ["&lt;", "&gt;", "&amp;", "&quot;"]) {
      expect(p).toContain(ent);
    }
  });

  it("both prompts list the unsupported constructs", () => {
    for (const format of ["html", "markdownv2"] as const) {
      const p = buildTelegramPrompt({ format });
      expect(p).toMatch(/image/i);
      expect(p).toMatch(/math/i);
      expect(p).toMatch(/footnote/i);
    }
  });

  it("omits examples when includeExamples is false", () => {
    expect(telegramMarkdownV2Prompt({ includeExamples: false })).not.toMatch(/Example/);
    expect(telegramMarkdownV2Prompt({ includeExamples: true })).toMatch(/Example/);
  });
});
