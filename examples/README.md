# Examples

Illustrative, runnable integrations. They are **not** part of the build or the published
package (and are excluded from `typecheck`/`lint`), so install their peer deps yourself.

## `ai-sdk-grammy.ts`

A Telegram bot using the [Vercel AI SDK](https://sdk.vercel.ai) + Anthropic + grammY,
showing the recommended pipeline (LLM → Markdown → `md-to-telegram` → Telegram):

- `/ask` — non-streaming, classic HTML, with `splitMessage` for long replies.
- `/stream` — token streaming via Bot API drafts (`sendMessageDraft`), finalized once.
- `/rich` — Rich Messages (`sendRichMessage`), near pass-through of the model's Markdown.

Run it:

```sh
pnpm add ai @ai-sdk/anthropic grammy md-to-telegram
export BOT_TOKEN=123:abc
export ANTHROPIC_API_KEY=sk-...
pnpm tsx examples/ai-sdk-grammy.ts
```

Notes:
- `sendMessageDraft` (Bot API 9.3+) and `sendRichMessage` (10.1) are recent methods; the
  example casts `bot.api` until your client's types include them.
- Streaming pushes an **ephemeral** draft preview while generating; only the final
  `sendMessage`/`sendRichMessage` persists the message.
