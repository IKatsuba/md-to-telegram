import { escapeHtml, type EscapeKind } from "../escape.js";
import type { Renderer } from "./renderer.js";

/** Renders mdast leaves to Telegram HTML. */
export const htmlRenderer: Renderer = {
  format: "html",
  text(value: string, kind: EscapeKind = "normal"): string {
    return escapeHtml(value, kind);
  },
  bold(inner: string): string {
    return `<b>${inner}</b>`;
  },
  italic(inner: string): string {
    return `<i>${inner}</i>`;
  },
  underline(inner: string): string {
    return `<u>${inner}</u>`;
  },
  strike(inner: string): string {
    return `<s>${inner}</s>`;
  },
  spoiler(inner: string): string {
    return `<tg-spoiler>${inner}</tg-spoiler>`;
  },
  inlineCode(value: string): string {
    return `<code>${escapeHtml(value, "code")}</code>`;
  },
  link(inner: string, url: string): string {
    return `<a href="${escapeHtml(url, "linkUrl")}">${inner}</a>`;
  },
  codeBlock(value: string, lang?: string): string {
    const body = escapeHtml(value, "code");
    return lang
      ? `<pre><code class="language-${escapeHtml(lang, "linkUrl")}">${body}</code></pre>`
      : `<pre>${body}</pre>`;
  },
  blockquote(inner: string, expandable: boolean): string {
    return expandable
      ? `<blockquote expandable>${inner}</blockquote>`
      : `<blockquote>${inner}</blockquote>`;
  },
  hardBreak(): string {
    return "\n";
  },
};
