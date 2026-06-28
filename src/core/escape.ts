/**
 * Per-format, per-context escaping.
 *
 * `EscapeKind` selects which rule applies:
 * - `normal`  — regular message text
 * - `code`    — inside `code`/`pre`
 * - `linkUrl` — inside the URL/target of a link
 */
export type EscapeKind = "normal" | "code" | "linkUrl";

/** The 18 characters MarkdownV2 reserves in normal text (per Telegram spec). */
export const MARKDOWNV2_RESERVED: readonly string[] = [
  "_",
  "*",
  "[",
  "]",
  "(",
  ")",
  "~",
  "`",
  ">",
  "#",
  "+",
  "-",
  "=",
  "|",
  "{",
  "}",
  ".",
  "!",
];

const MD_NORMAL = new Set<string>(MARKDOWNV2_RESERVED);

/** Escape text for Telegram HTML parse mode. */
export function escapeHtml(value: string, kind: EscapeKind = "normal"): string {
  let out = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (kind === "linkUrl") {
    out = out.replace(/"/g, "&quot;");
  }
  return out;
}

/** Escape text for Telegram MarkdownV2 parse mode. */
export function escapeMarkdownV2(value: string, kind: EscapeKind = "normal"): string {
  let out = "";
  for (const ch of value) {
    if (kind === "code") {
      // Inside code/pre: only ` and \ must be escaped.
      out += ch === "`" || ch === "\\" ? `\\${ch}` : ch;
    } else if (kind === "linkUrl") {
      // Inside the (...) of a link: only ) and \ must be escaped.
      out += ch === ")" || ch === "\\" ? `\\${ch}` : ch;
    } else {
      // Normal text: backslash itself + the 18 reserved characters.
      out += ch === "\\" || MD_NORMAL.has(ch) ? `\\${ch}` : ch;
    }
  }
  return out;
}
