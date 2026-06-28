/** Body of the prompt for the Telegram **HTML** parse mode. */
export function htmlPromptBody(includeExamples: boolean): string {
  const sections = [
    `Output Telegram-flavored **HTML** (the \`parse_mode: "HTML"\` dialect), NOT normal Markdown.`,

    `Supported tags — use ONLY these:
- Bold: <b>…</b> (or <strong>)
- Italic: <i>…</i> (or <em>)
- Underline: <u>…</u> (or <ins>)
- Strikethrough: <s>…</s> (or <del>)
- Spoiler: <tg-spoiler>…</tg-spoiler>
- Inline code: <code>…</code>
- Code block: <pre>…</pre>, or <pre><code class="language-python">…</code></pre> for a language
- Link: <a href="https://example.com">text</a>
- Blockquote: <blockquote>…</blockquote> (add the \`expandable\` attribute for a collapsible quote)`,

    `Escaping rules:
- Replace every literal <, > and & that is NOT part of a tag with &lt;, &gt; and &amp;.
- Inside an attribute value also escape " as &quot;.
- Only these four named entities are allowed: &lt;, &gt;, &amp;, &quot;. Numeric entities are also fine.`,

    `Unsupported — do NOT emit these, there are no Telegram entities for them:
- Images (no inline images in a text message).
- LaTeX math ($…$ or $$…$$).
- Footnotes.
- Any tag not in the supported list above (e.g. <h1>, <ul>, <table>, <sub>, <div>).
Headings, lists and tables have no native entity: render a heading as <b>…</b>, a list with "• " bullets or "1. " numbering, and a table as a fixed-width <pre> block.`,

    `Nesting: bold/italic/underline/strikethrough/spoiler may nest inside each other and inside links/quotes, but never inside <code>/<pre>. Blockquotes cannot be nested.`,
  ];

  if (includeExamples) {
    sections.push(
      `Example:
Input idea: a heading, a bolded word, a link, and some code.
Output:
<b>Setup</b>

Run <b>install</b> first, then see the <a href="https://example.com">docs</a>.

<pre><code class="language-bash">npm install</code></pre>`,
    );
  }

  return sections.join("\n\n");
}
