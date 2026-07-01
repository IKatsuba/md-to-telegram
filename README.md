# md-to-telegram

[![CI](https://github.com/ikatsuba/md-to-telegram/actions/workflows/ci.yml/badge.svg)](https://github.com/ikatsuba/md-to-telegram/actions/workflows/ci.yml)

Convert LLM-style Markdown (GFM + LaTeX math) into **Telegram-renderable** output —
in both Telegram formats — with a **typed report of everything that had no Telegram
equivalent**.

- ✅ Targets Telegram **HTML**, **MarkdownV2** (`parse_mode`), and **Rich Markdown**
  (the `markdown` field of `InputRichMessage`, Bot API 10.1 Rich Messages).
- ✅ Fully typed API; the result tells you exactly what was dropped (images, math,
  footnotes, unsupported HTML) and where.
- ✅ Generates an **LLM prompt** so a model writes convert-friendly Markdown.
- ✅ Understands Telegram-only directives (spoiler, underline, expandable quote).
- ✅ Dual ESM + CJS, no peer setup.

The conversion rules come straight from the specs in [`docs/`](./docs):
[Telegram formatting](./docs/telegram-formatting-spec.md),
[LLM Markdown](./docs/llm-markdown-spec.md), and the
[conversion mapping](./docs/conversion-mapping.md).

## Install

```sh
pnpm add md-to-telegram   # or npm i / yarn add
```

Requires Node ≥ 22.18.

## Usage

```ts
import { toTelegramHTML, toTelegramMarkdownV2 } from "md-to-telegram";

const md = "# Hello\n\nSome **bold** and a ![pic](https://x/y.png) and $a^2$.";

const { text, removed } = toTelegramHTML(md);
// text:    "<b>Hello</b>\n\nSome <b>bold</b> and a  and ."
// removed: [{ kind: "image", url: "https://x/y.png", alt: "pic", position: {…} },
//           { kind: "math", value: "a^2", inline: true, position: {…} }]

toTelegramMarkdownV2(md).text;
// "*Hello*\n\nSome *bold* and a  and \\."
```

`convert` is the same thing with an explicit format (handy when the target is dynamic):

```ts
import { convert } from "md-to-telegram";
convert(md, { format: "markdownv2" });
```

### Rich Messages (Bot API 10.1)

For clients that support [Rich Messages](https://core.telegram.org/bots/api#rich-messages),
Telegram renders headings, lists, tables, math, images, and footnotes **natively** — so
there's almost nothing to drop. `toTelegramRich` produces the string for the `markdown`
field of `InputRichMessage`:

```ts
import { toTelegramRich, validateRichMarkdown } from "md-to-telegram";

const { text, removed } = toTelegramRich(md);
// removed is always [] — Rich Markdown is GFM-compatible, so it's near pass-through.

// Length / structural limits are checked separately (it never splits for you):
const warnings = validateRichMarkdown(text); // RichLimitWarning[] (empty if within limits)

await bot.api.sendRichMessage(chatId, { markdown: text });
```

Use `rich` for capable clients and keep `html` / `markdownv2` as the fallback. When you
generate the source with an LLM, pass `target: "rich"` to `buildTelegramPrompt` so the
model is told it may use images, math, tables, and footnotes. An expandable blockquote
(`> [!expandable]`) becomes a collapsible `<details>` (label via the `expandableSummary`
option).

### Long messages (splitting)

Telegram rejects messages over a length limit (4096 for `parse_mode`, 32768 for Rich).
`splitMessage` breaks rendered output into parts that fit **without corrupting markup** —
it packs on block boundaries, re-wraps oversized code blocks, and closes/reopens any open
tags or inline marks at a seam:

```ts
import { splitMessage, toTelegramHTML } from "md-to-telegram";

const { text } = toTelegramHTML(longMarkdown);
for (const part of splitMessage(text, { format: "html" })) {
  await bot.api.sendMessage(chatId, part, { parse_mode: "HTML" });
}
```

Pass `maxLength` to override the per-format default.

### Streaming

Bot API 9.3+ can stream a reply with `sendMessageDraft` (and `sendRichMessageDraft` for
Rich). `sendMessageDraft` takes `parse_mode`, so stream a **formatted** preview: convert
the partial buffer each tick (`toTelegramHTML(buffer)`) and send it with `parse_mode`.
This is safe because `convert` always emits valid markup even from half-written Markdown
(an unclosed `**bold` stays literal until it closes — no 400s mid-stream). Reuse one
non-zero `draft_id` so updates animate, then send the final converted message once. See
[`examples/ai-sdk-grammy.ts`](./examples/ai-sdk-grammy.ts) for the full draft → finalize
flow with the Vercel AI SDK + grammY.

### Handling what was removed

`removed` is a discriminated union — narrow on `kind` to get exact, typed fields:

```ts
const { text, removed } = toTelegramHTML(md);

for (const item of removed) {
  switch (item.kind) {
    case "image":
      await bot.sendPhoto(chatId, item.url, { caption: item.alt });
      break;
    case "math":
      console.warn(`dropped ${item.inline ? "inline" : "block"} math: ${item.value}`);
      break;
    case "footnote": // item.identifier, item.variant, item.value
    case "html": // item.tagName, item.scope, item.value
      break;
  }
}
```

### Recommended pipeline: LLM → Markdown → convert

The most reliable setup is to let the model write **plain Markdown** and convert it
deterministically — no post-processing or "sanitizing" of model output needed.
`buildTelegramPrompt()` produces a single, format-agnostic system prompt that keeps the
model away from unconvertible constructs and teaches it the Telegram-only directives:

```ts
import { buildTelegramPrompt, toTelegramHTML } from "md-to-telegram";

const system = buildTelegramPrompt(); // "write Markdown, avoid images/math/...; you may use ||spoiler||, ..."
const markdown = await llm({ system, prompt: userTask });

const { text } = toTelegramHTML(markdown); // always valid Telegram HTML
await bot.sendMessage(chatId, text, { parse_mode: "HTML" });
```

### Telegram-only directives

Standard Markdown can't express some Telegram entities, so this library understands a
few small extensions (also documented in the generated prompt). They work in **both**
output formats:

| Directive | Markdown syntax | HTML | MarkdownV2 |
|---|---|---|---|
| Spoiler | `\|\|text\|\|` | `<tg-spoiler>` | `\|\|text\|\|` |
| Underline | `++text++` | `<u>` | `__text__` |
| Expandable quote | a blockquote starting with a `> [!expandable]` line | `<blockquote expandable>` | `**>…\|\|` |

## What maps to what

`md-to-telegram` re-serializes from a parsed AST, so Telegram entities are always
well-formed and correctly escaped. Highlights:

- **Direct:** bold, italic, bold+italic, strikethrough, inline code, links, code blocks,
  blockquotes.
- **Approximated:** headings → bold; lists → `•`/numbered/`☑`·`☐`; tables → fixed-width
  block; thematic break → a rule line; nested blockquotes → flattened (Telegram can't
  nest them).
- **Removed + reported** (no Telegram equivalent): images, LaTeX math, footnotes,
  unsupported raw HTML. Opt into light degradation with options
  (`images: "link"`, `math: "raw"`, `footnotes: "inline" | "append"`).

> Note: `__x__` is **bold** in Markdown but **underline** in Telegram MarkdownV2 —
> this library always emits bold as `*x*`, so it never silently becomes underline.

## Options

All options are optional; defaults match `docs/conversion-mapping.md`.

| Option | Default | Description |
|---|---|---|
| `tables` | `"pre"` | `"pre"` (fixed-width block) or `"remove"`. |
| `thematicBreak` | a line of `─` | A literal string, or `"blank"` for an empty line. |
| `flattenBlockquotes` | `true` | Flatten nested blockquotes to one level. |
| `images` | `"remove"` | `"remove"` or `"link"` (always reported either way). |
| `math` | `"remove"` | `"remove"` or `"raw"` (keep the LaTeX as code). |
| `footnotes` | `"remove"` | `"remove"`, `"inline"`, or `"append"`. |
| `collectRemoved` | `true` | Populate `result.removed`. |
| `listIndent` | `3` | Spaces per nested-list level. |
| `expandableSummary` | `"Details"` | `rich` only: `<summary>` label for `> [!expandable]` quotes. |

## Releasing

CI (lint, typecheck, build, tests, mutation) runs on every PR. Releases use
[Changesets](https://github.com/changesets/changesets) + npm **trusted publishing (OIDC)**:

1. Add a changeset in your PR: `pnpm changeset` (pick the bump, write a summary).
2. Merging to `main` opens a **"Version Packages"** PR (bumps version + `CHANGELOG.md`).
3. Merging that PR publishes to npm automatically with provenance — no stored token.

First publish only (npm can't configure OIDC for a name that doesn't exist yet): add a
temporary `NPM_TOKEN` secret, run the **Bootstrap publish** workflow once, configure the
trusted publisher in the npm package settings, then delete the secret.

## License

MIT © Igor Katsuba
