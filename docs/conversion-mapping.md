# Conversion Mapping: LLM Markdown ↔ Telegram

> Compiled 2026-06-28. Maps the source dialect
> ([`llm-markdown-spec.md`](./llm-markdown-spec.md)) onto Telegram's formatting
> ([`telegram-formatting-spec.md`](./telegram-formatting-spec.md)).

## Legend

| Mark | Meaning |
|---|---|
| **direct** | A native Telegram entity exists — 1:1 mapping, lossless. |
| **indirect** | No native entity, but it can be **approximated** by reusing another entity or plain text (visually close, semantically lossy). |
| **none** | No direct *and* no indirect analog. Content must be dumped as plain text, restructured, or sent out-of-band (loses its meaning). |

## Key finding: HTML and MarkdownV2 are capability-equal

Telegram's `HTML` and `MarkdownV2` parse modes compile to the **same set of message
entities**, so there is **no source construct that maps to one but not the other**.
Anything that maps, maps to *both*. The only practical difference is escaping
ergonomics (HTML: 3 chars `< > &`; MarkdownV2: 18 reserved chars + context-dependent
rules). The columns below give the concrete target syntax for each, but the
direct/indirect/none classification is identical across the two.

> Legacy Telegram `Markdown` (not MarkdownV2) is **not** covered here — it can't
> express underline/strikethrough/spoiler/blockquote/etc. and forbids nesting, so it
> is strictly weaker. Use MarkdownV2.

## Rich Messages target (Bot API 10.1) — the buckets collapse

The tables below describe the **classic** `parse_mode` targets (HTML / MarkdownV2). With
**Rich Messages** (`sendRichMessage`, the `rich` target via `toTelegramRich`), Telegram
renders structured content natively, so almost every `indirect`/`none` row becomes
**direct**:

| Source construct | classic (HTML / MarkdownV2) | rich (`toTelegramRich`) |
|---|---|---|
| Heading | indirect → bold | **direct** (`# …`) |
| Unordered / ordered / task list | indirect | **direct** (native list) |
| Table | indirect → monospace `<pre>` | **direct** (native `\| … \|`) |
| Thematic break | indirect | **direct** (`---`) |
| Image | none (removed) | **direct** (`![alt](url)`, own block) |
| LaTeX math (inline & block) | none (removed) | **direct** (`$…$`, `$$…$$`) |
| Footnote | none (removed) | **direct** (`[^id]` + definition) |
| Spoiler / underline | direct (via directive) | **direct** (`\|\|…\|\|`, `<u>…</u>`) |

Rich Markdown is GFM-compatible, so `toTelegramRich` is essentially a faithful
re-serialization of the source — `result.removed` is always empty. Structural limits
(32768 chars, 500 blocks, 16 nesting levels, 50 media, 20 columns) are checked separately
with `validateRichMarkdown`. Use rich for clients that support it; keep HTML/MarkdownV2 as
the fallback.

---

## Inline constructs

| Source (LLM md) | → Telegram HTML | → Telegram MarkdownV2 | Analog |
|---|---|---|:---:|
| `**bold**` | `<b>bold</b>` | `*bold*` | **direct** |
| `*italic*` | `<i>italic</i>` | `_italic_` | **direct** |
| `***both***` | `<b><i>both</i></b>` | `*_both_*` | **direct** |
| `~~struck~~` | `<s>struck</s>` | `~struck~` | **direct** |
| `` `code` `` | `<code>code</code>` | `` `code` `` | **direct** |
| `[t](url)` | `<a href="url">t</a>` | `[t](url)` | **direct** |
| `[t](url "title")` | `<a href="url">t</a>` | `[t](url)` | **direct** (title dropped) |
| `<https://url>` | `<a href="url">url</a>` | `[url](url)` | **direct** |
| bare `https://url` | leave as text (auto-linked) | leave as text (auto-linked) | **direct** |
| `![alt](url)` (image) | — | — | **none** (degrade to link, or send via `sendPhoto`) |
| `$E=mc^2$` (math) | — | — | **none** (best effort: unicode / plain) |
| `<sub>`, `<sup>`, … | — | — | **none** (unsupported tag; unicode approx only) |
| hard line break | `\n` | `\n` | **direct** |

---

## Block constructs

| Source (LLM md) | → Telegram HTML | → Telegram MarkdownV2 | Analog |
|---|---|---|:---:|
| `# Heading` | `<b>Heading</b>` + `\n` | `*Heading*` + `\n` | **indirect** (no heading entity → bold) |
| setext heading | same as ATX | same as ATX | **indirect** |
| paragraph | text + blank line | text + blank line | **direct** |
| `> quote` | `<blockquote>quote</blockquote>` | `>quote` | **direct** |
| nested `> >` | flatten to one level | flatten to one level | **indirect** (blockquotes can't nest) |
| ```` ```lang ```` | `<pre><code class="language-lang">…</code></pre>` | ```` ```lang ```` | **direct** |
| indented code | `<pre>…</pre>` | ```` ```…``` ```` | **direct** |
| `- item` (ul) | `• item` + `\n` | `• item` + `\n` | **indirect** (no list entity) |
| `1. item` (ol) | `1. item` + `\n` (manual) | `1\. item` + `\n` | **indirect** |
| `- [ ]` / `- [x]` | `☐ ` / `☑ ` + text | `☐ ` / `☑ ` + text | **indirect** |
| table | `<pre>` fixed-width render | ```` ``` ```` fixed-width render | **indirect** (no table entity) |
| `---` (thematic break) | line of `─` or blank | line of `─` or blank | **indirect** |
| `$$…$$` (math block) | — | — | **none** (best effort: `<pre>` / plain) |
| `[^1]` footnote | — | — | **none** (inline the note or append at end) |
| raw HTML block | strip / map known tags only | strip / map known tags only | **indirect / none** (depends on tag) |

---

## No direct *or* indirect analog (the "none" bucket)

These have no Telegram formatting entity and no faithful approximation. They must be
dropped, dumped as raw text, or handled outside the message body:

- **LaTeX math** — inline `$…$` and block `$$…$$`. Telegram has no math rendering.
  Best effort: convert simple expressions to unicode (`x^2` → `x²`), otherwise emit
  as plain text or wrap in `<pre>`. Meaning is lost for anything non-trivial.
- **Footnotes** `[^1]` — no footnote entity. Requires restructuring (inline the
  note, or collect and append a notes section at the end). Not a 1:1 analog.
- **Images** `![alt](url)` — there is no inline image **in formatted text**. Note
  that MarkdownV2's `![…](…)` syntax is **custom emoji**, *not* an image. Options:
  degrade to a link, or send the image as a separate `sendPhoto` call.
- **Unsupported inline HTML** — `<sub>`, `<sup>`, `<mark>`, `<kbd>`, `<div>`, etc.
  Only Telegram's whitelisted tags are honored; everything else has no entity.

---

## Reverse gap: Telegram features unreachable from LLM Markdown

Some Telegram-only entities have no standard Markdown syntax. This library adds **inline
directives** so an LLM can produce them, and the converter understands them:

| Telegram feature | Directive (source) | HTML | MarkdownV2 | rich |
|---|---|---|---|---|
| Underline | `++text++` | `<u>` | `__text__` | `<u>` |
| Spoiler | `\|\|text\|\|` | `<tg-spoiler>` | `\|\|text\|\|` | `\|\|text\|\|` |
| Expandable blockquote | `> [!expandable]` line | `<blockquote expandable>` | `**>…\|\|` | `<details><summary>…</summary>` |

These remain unreachable (need IDs/timestamps an LLM doesn't have), so the converter never
produces them:

| Telegram feature | HTML | MarkdownV2 |
|---|---|---|
| Custom emoji | `<tg-emoji>` | `![👍](tg://emoji?id=…)` |
| Date-time entity | `<tg-time>` | `![…](tg://time?…)` |

> ⚠️ **Critical ambiguity:** `__x__` is **bold** in CommonMark/GFM but **underline**
> in Telegram MarkdownV2. When emitting MarkdownV2, source `__bold__` must be
> rendered as `*bold*` (or `<b>` in HTML) — never passed through verbatim, or it
> silently becomes underline.
