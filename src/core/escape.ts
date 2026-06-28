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

// Inline-active characters in Rich Markdown that must be backslash-escaped in text.
const RICH_ACTIVE = new Set<string>(["\\", "`", "*", "_", "[", "]", "~", "|", "$"]);

/**
 * Escape text for Telegram **Rich Markdown** (the `InputRichMessage.markdown` field).
 *
 * Rich Markdown is GFM-compatible and may contain HTML, so we entity-escape `< > &`
 * (to avoid accidental HTML parsing) and backslash-escape the inline-active Markdown
 * characters. Line-start block starters (`#`, `-`, `>`…) are not escaped — a documented
 * limitation; LLM prose rarely starts a line with a literal block marker.
 */
export function escapeRich(value: string, kind: EscapeKind = "normal"): string {
  if (kind === "code") return value; // code spans/blocks are literal (caller widens fences)
  if (kind === "linkUrl") {
    return value.replace(/\\/g, "\\\\").replace(/\)/g, "\\)");
  }
  let out = "";
  for (const ch of value) {
    if (ch === "&") out += "&amp;";
    else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (RICH_ACTIVE.has(ch)) out += `\\${ch}`;
    else out += ch;
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
