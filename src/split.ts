import type { SplitOptions, TelegramFormat } from "./types.js";

const DEFAULT_MAX: Record<TelegramFormat, number> = {
  html: 4096,
  markdownv2: 4096,
  rich: 32768,
};

/**
 * Split rendered Telegram text into chunks that each fit Telegram's length limit
 * (UTF-16 code units), without corrupting markup. Blocks are packed greedily on the
 * `\n\n` boundaries our renderers emit; a single oversized block is split internally —
 * code blocks are re-wrapped per chunk, and formatted text is broken at whitespace with
 * open tags / inline marks closed at the seam and reopened in the next part.
 *
 * Operates on already-rendered output, so it composes with `convert`/`toTelegram*`.
 */
export function splitMessage(text: string, options: SplitOptions): string[] {
  const max = options.maxLength ?? DEFAULT_MAX[options.format];
  if (text.length <= max) return [text];

  const units: string[] = [];
  for (const block of text.split("\n\n")) {
    if (block.length <= max) units.push(block);
    else units.push(...splitBlock(block, options.format, max));
  }
  return packUnits(units, max);
}

/** Greedily join units with `\n\n` while staying within `max`. */
function packUnits(units: readonly string[], max: number): string[] {
  const parts: string[] = [];
  let cur = "";
  for (const u of units) {
    if (cur === "") cur = u;
    else if (cur.length + 2 + u.length <= max) cur += `\n\n${u}`;
    else {
      parts.push(cur);
      cur = u;
    }
  }
  if (cur !== "") parts.push(cur);
  return parts;
}

/* ------------------------------ oversized blocks -------------------------- */

function splitBlock(block: string, format: TelegramFormat, max: number): string[] {
  const code = matchCodeBlock(block, format);
  if (code) return splitCodeBlock(code, max);
  return assemble(tokenize(block, format), max);
}

interface CodeBlock {
  open: string;
  inner: string;
  close: string;
}

function matchCodeBlock(block: string, format: TelegramFormat): CodeBlock | null {
  if (format === "html") {
    const m = /^(<pre>(?:<code class="[^"]*">)?)([\s\S]*?)((?:<\/code>)?<\/pre>)$/.exec(block);
    return m ? { open: m[1]!, inner: m[2]!, close: m[3]! } : null;
  }
  if (block.startsWith("```") && block.endsWith("```") && block.includes("\n")) {
    const nl = block.indexOf("\n");
    const lastNl = block.lastIndexOf("\n");
    return { open: `${block.slice(0, nl)}\n`, inner: block.slice(nl + 1, lastNl), close: `\n${block.slice(lastNl + 1)}` };
  }
  return null;
}

function splitCodeBlock(code: CodeBlock, max: number): string[] {
  const budget = max - code.open.length - code.close.length;
  const chunks = budget > 0 ? packLines(code.inner, budget) : hardChunks(code.inner, max);
  return chunks.map((c) => code.open + c + code.close);
}

/** Pack lines into chunks <= budget, hard-splitting any single over-long line. */
function packLines(inner: string, budget: number): string[] {
  const chunks: string[] = [];
  let cur = "";
  for (const line of inner.split("\n")) {
    const pieces = line.length <= budget ? [line] : hardChunks(line, budget);
    for (const piece of pieces) {
      if (cur === "") cur = piece;
      else if (cur.length + 1 + piece.length <= budget) cur += `\n${piece}`;
      else {
        chunks.push(cur);
        cur = piece;
      }
    }
  }
  if (cur !== "") chunks.push(cur);
  return chunks.length > 0 ? chunks : [""];
}

/** Last-resort hard split by code points (never splits a surrogate pair). */
function hardChunks(text: string, budget: number): string[] {
  const chunks: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (cur.length + ch.length > budget && cur !== "") {
      chunks.push(cur);
      cur = "";
    }
    cur += ch;
  }
  if (cur !== "") chunks.push(cur);
  return chunks;
}

/* --------------------------- tokenize + assemble -------------------------- */

interface Tok {
  emit: string;
  kind: "open" | "close" | "text";
  reopen?: string;
  close?: string;
  brk?: number; // 2 = newline, 1 = space, 0 = none
}

function closeStack(stack: readonly { close: string }[]): string {
  let s = "";
  for (let k = stack.length - 1; k >= 0; k--) s += stack[k]!.close;
  return s;
}

/**
 * Assemble tokens into parts <= max, closing any open entity at a cut and reopening it
 * at the start of the next part. Prefers to break at newlines, then spaces.
 */
function assemble(tokens: readonly Tok[], max: number): string[] {
  const parts: string[] = [];
  let inherited: { reopen: string; close: string }[] = [];
  let i = 0;
  while (i < tokens.length) {
    const stack = inherited.slice();
    let out = stack.map((f) => f.reopen).join("");
    const base = out.length;
    let closeLen = closeStack(stack).length;
    let brkPos = -1;
    let brkStack: { reopen: string; close: string }[] = [];
    let brkNext = -1;
    let brkRank = 0;

    while (i < tokens.length) {
      const tok = tokens[i]!;
      const closeAfter =
        tok.kind === "open"
          ? closeLen + tok.close!.length
          : tok.kind === "close"
            ? closeLen - (stack[stack.length - 1]?.close.length ?? 0)
            : closeLen;
      if (out.length + tok.emit.length + closeAfter > max && out.length > base) break;

      out += tok.emit;
      if (tok.kind === "open") {
        stack.push({ reopen: tok.reopen!, close: tok.close! });
        closeLen += tok.close!.length;
      } else if (tok.kind === "close") {
        closeLen -= stack.pop()?.close.length ?? 0;
      } else if (tok.brk && tok.brk >= brkRank) {
        brkPos = out.length;
        brkStack = stack.slice();
        brkNext = i + 1;
        brkRank = tok.brk;
      }
      i++;
    }

    if (i >= tokens.length) {
      parts.push(out + closeStack(stack));
      break;
    }
    if (brkNext > 0) {
      parts.push(out.slice(0, brkPos) + closeStack(brkStack));
      inherited = brkStack;
      i = brkNext;
    } else if (out.length > base) {
      // no break point found: hard cut here, continue from the same token
      parts.push(out + closeStack(stack));
      inherited = stack;
    } else {
      // a single token can't fit even alone: emit it anyway to guarantee progress
      parts.push(out + tokens[i]!.emit + closeStack(stack));
      i++;
      inherited = stack;
    }
  }
  return parts;
}

function tokenize(block: string, format: TelegramFormat): Tok[] {
  return format === "html" ? tokenizeHtml(block) : tokenizeMarkdown(block, format);
}

function tokenizeHtml(block: string): Tok[] {
  const tokens: Tok[] = [];
  const re = /<\/[a-zA-Z][^>]*>|<[a-zA-Z][^>]*>|&[^;\s]+;|[\s\S]/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const t = m[0];
    if (t.startsWith("</")) {
      tokens.push({ emit: t, kind: "close" });
    } else if (t.startsWith("<")) {
      const name = /^<([a-zA-Z0-9-]+)/.exec(t)![1];
      tokens.push({ emit: t, kind: "open", reopen: t, close: `</${name}>` });
    } else {
      tokens.push({ emit: t, kind: "text", brk: t === "\n" ? 2 : t === " " ? 1 : 0 });
    }
  }
  return tokens;
}

function tokenizeMarkdown(block: string, format: TelegramFormat): Tok[] {
  const multi = format === "rich" ? ["**", "~~", "||"] : ["__", "||"];
  const single = format === "rich" ? ["*", "_"] : ["*", "_", "~"];
  const open = new Map<string, boolean>();
  const toggle = (mark: string): Tok =>
    open.get(mark)
      ? (open.set(mark, false), { emit: mark, kind: "close" })
      : (open.set(mark, true), { emit: mark, kind: "open", reopen: mark, close: mark });

  const tokens: Tok[] = [];
  let inCode = false;
  let i = 0;
  while (i < block.length) {
    const rest = block.slice(i);
    if (block[i] === "\\" && i + 1 < block.length) {
      tokens.push({ emit: block.slice(i, i + 2), kind: "text", brk: 0 });
      i += 2;
      continue;
    }
    if (block[i] === "`") {
      tokens.push(inCode ? { emit: "`", kind: "close" } : { emit: "`", kind: "open", reopen: "`", close: "`" });
      inCode = !inCode;
      i += 1;
      continue;
    }
    if (!inCode) {
      if (format === "rich" && rest.startsWith("<u>")) {
        tokens.push({ emit: "<u>", kind: "open", reopen: "<u>", close: "</u>" });
        i += 3;
        continue;
      }
      if (format === "rich" && rest.startsWith("</u>")) {
        tokens.push({ emit: "</u>", kind: "close" });
        i += 4;
        continue;
      }
      const mk = multi.find((k) => rest.startsWith(k)) ?? single.find((k) => block[i] === k);
      if (mk) {
        tokens.push(toggle(mk));
        i += mk.length;
        continue;
      }
    }
    const cp = block.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    tokens.push({ emit: ch, kind: "text", brk: ch === "\n" ? 2 : ch === " " ? 1 : 0 });
    i += ch.length;
  }
  return tokens;
}
