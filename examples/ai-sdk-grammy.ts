/**
 * Example: Vercel AI SDK + grammY + md-to-telegram.
 *
 * The recommended pipeline — the model writes plain Markdown, md-to-telegram converts it
 * to valid Telegram output deterministically, and `removed`/`splitMessage` handle the
 * edges. Also shows token streaming via Bot API 9.3+ drafts.
 *
 * This file is illustrative and is NOT built or type-checked by the package.
 * Install the peer deps to run it (see examples/README.md):
 *   pnpm add ai @ai-sdk/anthropic grammy
 */
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, streamText } from "ai";
import { Bot } from "grammy";
import {
  buildTelegramPrompt,
  splitMessage,
  toTelegramHTML,
  toTelegramRich,
  type RemovedItem,
} from "md-to-telegram";

const bot = new Bot(process.env.BOT_TOKEN!);
const model = anthropic("claude-opus-4-8");

// Build the prompt once. Use target:"rich" if you send Rich Messages.
const classicSystem = buildTelegramPrompt();
const richSystem = buildTelegramPrompt({ target: "rich" });

/** Send anything md-to-telegram couldn't render inline (images, math, …) out of band. */
async function sendRemoved(chatId: number, removed: readonly RemovedItem[]): Promise<void> {
  for (const item of removed) {
    if (item.kind === "image") {
      await bot.api.sendPhoto(chatId, item.url, item.alt ? { caption: item.alt } : {});
    }
  }
}

// 1. Classic HTML, non-streaming, with auto-splitting for long replies.
bot.command("ask", async (ctx) => {
  const { text: markdown } = await generateText({
    model,
    system: classicSystem,
    prompt: ctx.match || "Say hello.",
  });

  const { text, removed } = toTelegramHTML(markdown);
  for (const part of splitMessage(text, { format: "html" })) {
    await ctx.reply(part, { parse_mode: "HTML" });
  }
  await sendRemoved(ctx.chat.id, removed);
});

// 2. Streaming with Bot API drafts: push a FORMATTED partial preview while generating,
//    then persist the real message once. The draft is ephemeral (~30s).
//
//    sendMessageDraft takes parse_mode, so the preview must be converted too — and it's
//    safe to convert the partial buffer on every tick: md-to-telegram always emits valid
//    markup (an unclosed `**bold` stays literal until it closes), so no 400s mid-stream.
bot.command("stream", async (ctx) => {
  const result = streamText({ model, system: classicSystem, prompt: ctx.match || "Explain streaming." });
  const draftId = ctx.message?.message_id ?? 1; // any stable non-zero id; same id animates updates

  let buffer = "";
  let lastPush = 0;
  for await (const delta of result.textStream) {
    buffer += delta;
    if (buffer.length - lastPush < 80) continue; // throttle
    lastPush = buffer.length;

    // Convert the partial buffer -> always-valid HTML; keep within the 4096 draft limit
    // by previewing the tail when it grows past the cap.
    let preview = toTelegramHTML(buffer).text;
    if (preview.length > 4096) preview = toTelegramHTML(buffer.slice(-3000)).text;

    // sendMessageDraft (Bot API 9.3+) — cast until your client types include it
    await (bot.api as any).sendMessageDraft(ctx.chat.id, {
      draft_id: draftId,
      text: preview,
      parse_mode: "HTML",
    });
  }

  // Finalize: persist the real, fully-converted message(s).
  const { text, removed } = toTelegramHTML(await result.text);
  for (const part of splitMessage(text, { format: "html" })) {
    await ctx.reply(part, { parse_mode: "HTML" });
  }
  await sendRemoved(ctx.chat.id, removed);
});

// 3. Rich Messages (Bot API 10.1) — near pass-through; nothing gets dropped.
bot.command("rich", async (ctx) => {
  const { text: markdown } = await generateText({
    model,
    system: richSystem,
    prompt: ctx.match || "Give a short report with a table and a formula.",
  });

  const { text } = toTelegramRich(markdown);
  // sendRichMessage (Bot API 10.1) — cast until your client types include it
  await (bot.api as any).sendRichMessage(ctx.chat.id, { markdown: text });
});

bot.start();
