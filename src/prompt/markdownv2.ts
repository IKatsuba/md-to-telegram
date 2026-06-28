import { MARKDOWNV2_RESERVED } from "../core/escape.js";

/** Body of the prompt for the Telegram **MarkdownV2** parse mode. */
export function markdownV2PromptBody(includeExamples: boolean): string {
  const reserved = MARKDOWNV2_RESERVED.join(" ");

  const sections = [
    `Output Telegram **MarkdownV2** (the \`parse_mode: "MarkdownV2"\` dialect), NOT GitHub/CommonMark Markdown.`,

    `Supported syntax — use ONLY these:
- Bold: *text*  (NOTE: a single asterisk, not **)
- Italic: _text_
- Underline: __text__
- Strikethrough: ~text~
- Spoiler: ||text||
- Inline code: \`text\`
- Code block: \`\`\`  …  \`\`\`  (put the language right after the opening fence, e.g. \`\`\`python)
- Link: [text](https://example.com)
- Blockquote: prefix each line with >`,

    `Escaping rules:
- In normal text, every one of these characters must be backslash-escaped: ${reserved}
  (also escape a literal backslash \\ itself).
- Inside \`code\`/\`\`\` blocks, escape only \` and \\.
- Inside the (...) URL part of a link, escape only ) and \\.
- CRITICAL: __text__ means UNDERLINE in MarkdownV2 (it is bold in normal Markdown). For bold always write *text*.`,

    `Unsupported — do NOT emit these, there are no Telegram entities for them:
- Images.
- LaTeX math ($…$ or $$…$$).
- Footnotes.
Headings, lists and tables have no native entity: render a heading as *bold* text, a list with "• " bullets or escaped "1\\. " numbering, and a table as a fixed-width \`\`\` code block.`,

    `Nesting: bold/italic/underline/strikethrough/spoiler may nest inside each other and inside links/quotes, but never inside code blocks. Blockquotes cannot be nested.`,
  ];

  if (includeExamples) {
    sections.push(
      `Example (note the escaped . and !):
*Setup*

Run *install* first \\(v2\\.0\\!\\), then see the [docs](https://example.com)\\.

\`\`\`bash
npm install
\`\`\``,
    );
  }

  return sections.join("\n\n");
}
