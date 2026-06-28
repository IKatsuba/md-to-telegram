import { createContext } from "./core/context.js";
import { transformDirectives } from "./core/directives.js";
import { normalizeOptions } from "./core/options.js";
import { collectDefinitions, collectFootnotes, parse } from "./core/parse.js";
import { htmlRenderer } from "./core/renderers/html.js";
import { markdownV2Renderer } from "./core/renderers/markdownv2.js";
import type { Renderer } from "./core/renderers/renderer.js";
import { serializeRich } from "./core/rich/serialize.js";
import { renderFlow } from "./core/walk.js";
import type { ConvertOptions, FormatOptions, TelegramResult } from "./types.js";

/** Convert Markdown to a Telegram-renderable string in the requested format. */
export function convert(markdown: string, options: ConvertOptions): TelegramResult {
  if (options.format === "rich") {
    const root = transformDirectives(parse(markdown));
    return {
      text: serializeRich(root, collectDefinitions(root)),
      format: "rich",
      removed: [],
    };
  }

  const opts = normalizeOptions(options);
  const renderer: Renderer = options.format === "html" ? htmlRenderer : markdownV2Renderer;
  const root = transformDirectives(parse(markdown));
  const ctx = createContext(renderer, collectDefinitions(root), collectFootnotes(root), opts);

  let text = renderFlow(root.children, ctx, "\n\n");

  if (opts.footnotes === "append" && ctx.footnotes.size > 0) {
    const notes: string[] = [];
    for (const def of ctx.footnotes.values()) {
      const label = def.label ?? def.identifier;
      const body = renderFlow(def.children, ctx, " ");
      notes.push(`${renderer.text(`[${label}] `, "normal")}${body}`);
    }
    if (text !== "") text += "\n\n";
    text += notes.join("\n");
  }

  return { text, format: options.format, removed: ctx.removed };
}

/** Convert Markdown to Telegram HTML. */
export function toTelegramHTML(markdown: string, options?: FormatOptions): TelegramResult {
  return convert(markdown, { ...options, format: "html" });
}

/** Convert Markdown to Telegram MarkdownV2. */
export function toTelegramMarkdownV2(markdown: string, options?: FormatOptions): TelegramResult {
  return convert(markdown, { ...options, format: "markdownv2" });
}

/**
 * Convert Markdown to Telegram **Rich Markdown** — the string for the `markdown` field of
 * `InputRichMessage` (Bot API 10.1 Rich Messages). Headings, lists, tables, math, media,
 * and footnotes are preserved natively, so `removed` is always empty. Validate length and
 * structural limits separately with `validateRichMarkdown`.
 */
export function toTelegramRich(markdown: string, options?: FormatOptions): TelegramResult {
  return convert(markdown, { ...options, format: "rich" });
}
