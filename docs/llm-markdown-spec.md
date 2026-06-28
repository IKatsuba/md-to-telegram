# Markdown that LLMs Generate

> Compiled 2026-06-28. Reference for the Markdown dialect produced by large language models.

## What "LLM Markdown" actually is

There is **no single official spec** for the Markdown that LLMs emit. In practice
all major models (Claude, GPT, Gemini, etc.) converge on:

- **[CommonMark](https://spec.commonmark.org/)** — the strict base dialect.
- **[GitHub Flavored Markdown (GFM)](https://github.github.com/gfm/)** — a *strict
  superset* of CommonMark that adds 5 extensions (see below).
- **A few extras** that aren't in GFM but LLMs emit heavily: LaTeX math, and
  occasionally footnotes and raw inline HTML.

So the practical source grammar is: **GFM + LaTeX math**.

### GFM extensions over CommonMark

| Extension | What it adds |
|---|---|
| Tables | Pipe-delimited rows/columns with alignment row |
| Task list items | `- [ ]` / `- [x]` checkboxes inside lists |
| Strikethrough | `~~text~~` |
| Autolinks (extended) | Bare URLs/emails become links without `<>` |
| Disallowed raw HTML (tagfilter) | Sanitizes a few unsafe HTML tags |

---

## Construct catalog

### Inline constructs

| Construct | Markdown syntax |
|---|---|
| Bold | `**bold**` or `__bold__` |
| Italic | `*italic*` or `_italic_` |
| Bold + italic | `***both***` |
| Strikethrough (GFM) | `~~struck~~` |
| Inline code | `` `code` `` |
| Link | `[text](https://url)` |
| Link with title | `[text](https://url "title")` |
| Autolink | `<https://url>` |
| Bare URL (GFM autolink) | `https://url` |
| Image | `![alt](https://url)` |
| LaTeX inline (extra) | `$E = mc^2$` |
| Raw inline HTML (extra) | `<sub>x</sub>` |
| Hard line break | trailing `  ` (2 spaces) or `\` |

### Block constructs

| Construct | Markdown syntax |
|---|---|
| ATX heading | `# H1` … `###### H6` |
| Setext heading | text + `===` / `---` underline |
| Paragraph | blank-line-separated text |
| Blockquote | `> quoted` |
| Nested blockquote | `> > deeper` |
| Fenced code block | ```` ```lang ```` … ```` ``` ```` |
| Indented code block | 4-space indent |
| Unordered list | `- ` / `* ` / `+ ` |
| Ordered list | `1.` `2.` … |
| Task list (GFM) | `- [ ]` / `- [x]` |
| Table (GFM) | `\| a \| b \|` + `\|---\|---\|` |
| Thematic break | `---` / `***` / `___` |
| LaTeX block (extra) | `$$ ... $$` |
| HTML block (extra) | raw `<div>…</div>` |
| Footnote (extra) | `text[^1]` … `[^1]: note` |

---

## Canonical example (what a typical LLM reply looks like)

````markdown
# Project Setup

Here's how to get started with **md-to-telegram**.

## Steps

1. Install dependencies
2. Run the *converter* with your `input.md`

> Note: GFM tables are ~~not~~ always supported by every renderer.

- [x] Parse CommonMark
- [ ] Map to the target format

```python
def convert(md: str) -> str:
    return transform(md)
```

| Feature | Status |
|---------|--------|
| Bold    | ✅     |
| Tables  | ❌     |

See the [docs](https://example.com) for more. Inline math: $a^2 + b^2 = c^2$.

---

That's it!
````

This single snippet exercises almost every construct an LLM emits: headings,
ordered/unordered/task lists, bold/italic/strikethrough/inline-code, blockquote,
fenced code with language, a table, a link, inline math, and a thematic break.
