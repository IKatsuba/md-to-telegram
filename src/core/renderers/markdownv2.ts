import { escapeMarkdownV2, type EscapeKind } from "../escape.js";
import type { Renderer } from "./renderer.js";

/** Renders mdast leaves to Telegram MarkdownV2. */
export const markdownV2Renderer: Renderer = {
  format: "markdownv2",
  text(value: string, kind: EscapeKind = "normal"): string {
    return escapeMarkdownV2(value, kind);
  },
  // `strong` always emits `*x*`: GFM `__x__` is bold, but MarkdownV2 `__x__`
  // is underline — re-serializing from the AST avoids that trap structurally.
  bold(inner: string): string {
    return `*${inner}*`;
  },
  italic(inner: string): string {
    return `_${inner}_`;
  },
  strike(inner: string): string {
    return `~${inner}~`;
  },
  inlineCode(value: string): string {
    return `\`${escapeMarkdownV2(value, "code")}\``;
  },
  link(inner: string, url: string): string {
    return `[${inner}](${escapeMarkdownV2(url, "linkUrl")})`;
  },
  codeBlock(value: string, lang?: string): string {
    const body = escapeMarkdownV2(value, "code");
    return lang ? `\`\`\`${lang}\n${body}\n\`\`\`` : `\`\`\`\n${body}\n\`\`\``;
  },
  blockquote(inner: string, expandable: boolean): string {
    const lines = inner.split("\n");
    if (expandable) {
      return lines.map((line, i) => (i === 0 ? `**>${line}` : `>${line}`)).join("\n") + "||";
    }
    return lines.map((line) => `>${line}`).join("\n");
  },
  hardBreak(): string {
    return "\n";
  },
};
