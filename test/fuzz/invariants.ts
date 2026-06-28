/** Structural invariants used by the robustness tests. */

export interface Check {
  ok: boolean;
  error?: string;
}

const OPEN_SIMPLE = /^<(b|i|u|s|tg-spoiler|code|pre|blockquote)>$/;
const OPEN_BLOCKQUOTE_EXP = /^<blockquote expandable>$/;
const OPEN_A = /^<a href="[^"<>]*">$/;
const OPEN_CODE_LANG = /^<code class="language-[^"<>]*">$/;
const CLOSE = /^<\/(b|i|u|s|tg-spoiler|code|pre|blockquote|a)>$/;
// An `&` that does NOT start a valid HTML entity.
const BAD_AMP = /&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/;

function checkText(text: string): string | null {
  if (text.includes("<") || text.includes(">")) {
    return `raw angle bracket in text: ${JSON.stringify(text.slice(0, 60))}`;
  }
  if (BAD_AMP.test(text)) return `unescaped & in text: ${JSON.stringify(text.slice(0, 60))}`;
  return null;
}

/**
 * Validate that a string is well-formed Telegram HTML as this library emits it:
 * only whitelisted tags, correctly balanced/nested, and all text-level `< > &`
 * entity-escaped. A real escaping or nesting bug fails this check.
 */
export function validateTelegramHtml(html: string): Check {
  const tagRe = /<[^>]*>/g;
  const stack: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html)) !== null) {
    const textErr = checkText(html.slice(last, m.index));
    if (textErr) return { ok: false, error: textErr };
    last = tagRe.lastIndex;

    const tag = m[0];
    if (CLOSE.test(tag)) {
      const name = tag.slice(2, -1);
      const top = stack.pop();
      if (top !== name) return { ok: false, error: `unbalanced close </${name}> (top=${top})` };
    } else if (OPEN_SIMPLE.test(tag)) {
      stack.push(tag.slice(1, -1));
    } else if (OPEN_BLOCKQUOTE_EXP.test(tag)) {
      stack.push("blockquote");
    } else if (OPEN_A.test(tag)) {
      stack.push("a");
    } else if (OPEN_CODE_LANG.test(tag)) {
      stack.push("code");
    } else {
      return { ok: false, error: `disallowed/malformed tag: ${tag}` };
    }
  }
  const tailErr = checkText(html.slice(last));
  if (tailErr) return { ok: false, error: tailErr };
  if (stack.length > 0) return { ok: false, error: `unclosed tags: ${stack.join(", ")}` };
  return { ok: true };
}

/**
 * Validate that every backslash escapes an allowed character (no dangling/odd escapes).
 * `allowed` is the set of characters that may legally follow a backslash.
 */
export function noDanglingEscape(text: string, allowed: string): Check {
  const set = new Set([...allowed]);
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] !== "\\") continue;
    const next = chars[i + 1];
    if (next === undefined) return { ok: false, error: "trailing backslash" };
    if (!set.has(next)) {
      return { ok: false, error: `backslash escapes disallowed char ${JSON.stringify(next)}` };
    }
    i++; // skip the escaped char
  }
  return { ok: true };
}

/** Characters a backslash may precede in MarkdownV2 output. */
export const MDV2_ESCAPABLE = "_*[]()~`>#+-=|{}.!\\";
/** Characters a backslash may precede in Rich Markdown output. */
export const RICH_ESCAPABLE = "\\`*_[]~|$)\"]";
