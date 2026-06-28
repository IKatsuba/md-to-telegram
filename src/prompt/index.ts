import type { PromptOptions } from "../types.js";

/**
 * Build an LLM prompt for the recommended pipeline: the model writes plain Markdown,
 * then {@link convert} turns it into valid Telegram output.
 *
 * - `target: "classic"` (default) — for the HTML/MarkdownV2 targets: keeps the model away
 *   from constructs Telegram can't render (images, math, footnotes, raw HTML).
 * - `target: "rich"` — for the Rich Messages target: those constructs ARE supported and
 *   the model is encouraged to use the full GFM feature set.
 */
export function buildTelegramPrompt(options?: PromptOptions): string {
  const target = options?.target ?? "classic";
  const style = options?.style ?? "system";
  const includeExamples = options?.includeExamples ?? true;

  const intro =
    style === "system"
      ? "You are writing a message that will be delivered through a Telegram bot. Write it in standard Markdown; it will be converted to Telegram formatting automatically. Follow these rules."
      : "Write the message in standard Markdown (it will be converted to Telegram formatting automatically), following these rules.";

  const directives = `Telegram-only directives you MAY use (plain Markdown has no syntax for these):
- Spoiler: ||hidden text||
- Underline: ++underlined text++
- Expandable (collapsible) quote: start a blockquote with a \`[!expandable]\` line:
  > [!expandable]
  > hidden by default`;

  const sections =
    target === "rich"
      ? [
          intro,
          `Use the full GitHub-Flavored Markdown feature set — Telegram renders it natively:
- **bold**, *italic*, ~~strikethrough~~, \`inline code\`, fenced code blocks
- # headings, bullet/numbered/task lists (- [ ] / - [x]), tables, and --- dividers
- > blockquotes, [links](https://example.com)
- images: ![alt](https://example.com/pic.jpg)
- math: $E=mc^2$ inline and $$...$$ as a block
- footnotes: text[^1] with [^1]: definition

You do NOT need to escape any characters — write naturally; escaping is handled for you.`,
          directives,
        ]
      : [
          intro,
          `Use normal Markdown for formatting:
- **bold**, *italic*, ~~strikethrough~~, \`inline code\`
- fenced code blocks (with a language, e.g. \`\`\`python)
- [links](https://example.com)
- > blockquotes
- bullet and numbered lists, and task lists (- [ ] / - [x])

You do NOT need to escape any characters — write naturally; escaping is handled for you.`,
          directives,
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
      target === "rich"
        ? `Example message:
# Release notes

We shipped **dark mode** and the formula $a^2+b^2=c^2$.

| Feature | Status |
|---------|--------|
| Dark mode | done |

> [!expandable]
> Full changelog available on request.`
        : `Example message:
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
