import type { PromptOptions } from "../types.js";
import { htmlPromptBody } from "./html.js";
import { markdownV2PromptBody } from "./markdownv2.js";

/**
 * Build an LLM prompt that instructs a model to emit Telegram-native markup for
 * the given format directly, instead of normal Markdown.
 */
export function buildTelegramPrompt(options: PromptOptions): string {
  const style = options.style ?? "system";
  const includeExamples = options.includeExamples ?? true;
  const body =
    options.format === "html"
      ? htmlPromptBody(includeExamples)
      : markdownV2PromptBody(includeExamples);

  const intro =
    style === "system"
      ? `You are formatting a message for Telegram. Follow these rules exactly.`
      : `When you write the message, format it for Telegram following these rules exactly.`;

  return `${intro}\n\n${body}`;
}

/** Prompt for the Telegram HTML parse mode. */
export function telegramHtmlPrompt(options?: Omit<PromptOptions, "format">): string {
  return buildTelegramPrompt({ ...options, format: "html" });
}

/** Prompt for the Telegram MarkdownV2 parse mode. */
export function telegramMarkdownV2Prompt(options?: Omit<PromptOptions, "format">): string {
  return buildTelegramPrompt({ ...options, format: "markdownv2" });
}
