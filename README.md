# md-to-telegram

Convert LLM-style Markdown (GFM + LaTeX math) into **Telegram-renderable** output —
in both Telegram formats — with a **typed report of everything that had no Telegram
equivalent**.

- ✅ Targets both Telegram **HTML** and **MarkdownV2** (`parse_mode`).
- ✅ Fully typed API; the result tells you exactly what was dropped (images, math,
  footnotes, unsupported HTML) and where.
- ✅ Generates an **LLM prompt** so a model emits Telegram-native markup directly.
- ✅ Dual ESM + CJS, no peer setup.

The conversion rules come straight from the specs in [`docs/`](./docs):
[Telegram formatting](./docs/telegram-formatting-spec.md),
[LLM Markdown](./docs/llm-markdown-spec.md), and the
[conversion mapping](./docs/conversion-mapping.md).

## Install

```sh
pnpm add md-to-telegram   # or npm i / yarn add
```

Requires Node ≥ 20.19.

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

### Generate a prompt for an LLM

Make a model produce Telegram-native markup in the first place, so there is nothing to
strip later:

```ts
import { telegramHtmlPrompt, telegramMarkdownV2Prompt } from "md-to-telegram";

const system = telegramHtmlPrompt(); // rules + escaping + supported/unsupported list
// pass as a system prompt to your model
```

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

## Not (yet) handled

- **Message length** — Telegram caps a message at 4096 chars; splitting long output is
  left to the caller for now.

## License

MIT © Igor Katsuba
