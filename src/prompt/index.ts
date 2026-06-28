import type { PromptOptions } from "../types.js";

/**
 * Build an LLM prompt for the recommended pipeline: the model writes plain
 * Markdown, then {@link convert} turns it into valid Telegram output. The prompt
 * keeps the model away from constructs that have no Telegram equivalent and
 * teaches the few Telegram-only directives this library understands.
 */
export function buildTelegramPrompt(options?: PromptOptions): string {
  const style = options?.style ?? "system";
  const includeExamples = options?.includeExamples ?? true;

  const intro =
    style === "system"
      ? "You are writing a message that will be delivered through a Telegram bot. Write it in standard Markdown; it will be converted to Telegram formatting automatically. Follow these rules."
      : "Write the message in standard Markdown (it will be converted to Telegram formatting automatically), following these rules.";

  const sections = [
    intro,

    `Use normal Markdown for formatting:
- **bold**, *italic*, ~~strikethrough~~, \`inline code\`
- fenced code blocks (with a language, e.g. \`\`\`python)
- [links](https://example.com)
- > blockquotes
- bullet and numbered lists, and task lists (- [ ] / - [x])

You do NOT need to escape any characters — write naturally; escaping is handled for you.`,

    `Telegram-only directives you MAY use (plain Markdown has no syntax for these):
- Spoiler: ||hidden text||
- Underline: ++underlined text++
- Expandable (collapsible) quote: start a blockquote with a \`[!expandable]\` line:
  > [!expandable]
  > hidden by default`,

    `Do NOT use these — Telegram cannot render them and they will be removed:
- Images: ![alt](url)
- LaTeX math: $...$ or $$...$$
- Footnotes: [^1]
- Raw HTML tags: <div>, <sub>, <table>, etc.

These have no Telegram entity and are approximated, so prefer alternatives:
- Headings become bold text.
- Tables become a fixed-width (monospace) block — keep them small.`,
  ];

  if (includeExamples) {
    sections.push(
      `Example message:
# Release notes

We shipped **dark mode** and fixed the ||secret|| crash.

- [x] ship it
- [ ] write docs

> [!expandable]
> Full changelog available on request.`,
    );
  }

  return sections.join("\n\n");
}
