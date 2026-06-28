import { describe, expect, it } from "vitest";
import { type EscapeKind, escapeHtml, escapeMarkdownV2, escapeRich } from "../../src/core/escape.js";
import { MDV2_ESCAPABLE, RICH_ESCAPABLE, noDanglingEscape } from "./invariants.js";

// A nasty alphabet: every MarkdownV2 reserved char, HTML specials, backslash,
// quotes, whitespace, and a few unicode scalars.
const ALPHABET = [
  ..."_*[]()~`>#+-=|{}.!",
  ..."<>&\"'\\/ \t\n",
  ..."abcXY0",
  "😀",
  "中",
  "́",
  "‍",
];

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomStrings(count: number, seed: number): string[] {
  const rand = mulberry32(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = Math.floor(rand() * 24);
    let s = "";
    for (let j = 0; j < len; j++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)];
    out.push(s);
  }
  return out;
}

const SAMPLES = randomStrings(500, 0xc0ffee);
const KINDS: EscapeKind[] = ["normal", "code", "linkUrl"];

/** Reverse MarkdownV2 escaping: drop a backslash that precedes an escapable char. */
function unescapeMarkdownV2(text: string): string {
  const escapable = new Set([...MDV2_ESCAPABLE]);
  const chars = [...text];
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === "\\" && chars[i + 1] !== undefined && escapable.has(chars[i + 1]!)) {
      out += chars[i + 1];
      i++;
    } else {
      out += chars[i];
    }
  }
  return out;
}

describe("escapeMarkdownV2 — fuzz", () => {
  it("never leaves a dangling escape, and round-trips", () => {
    for (const s of SAMPLES) {
      for (const kind of KINDS) {
        const escaped = escapeMarkdownV2(s, kind);
        const d = noDanglingEscape(escaped, MDV2_ESCAPABLE);
        expect(d.ok, `${d.error} for ${JSON.stringify(s)} [${kind}]`).toBe(true);
        expect(unescapeMarkdownV2(escaped), `round-trip ${JSON.stringify(s)} [${kind}]`).toBe(s);
      }
    }
  });
});

describe("escapeRich — fuzz", () => {
  it("never leaves a dangling escape (normal/linkUrl)", () => {
    for (const s of SAMPLES) {
      for (const kind of ["normal", "linkUrl"] as const) {
        const escaped = escapeRich(s, kind);
        const d = noDanglingEscape(escaped, RICH_ESCAPABLE);
        expect(d.ok, `${d.error} for ${JSON.stringify(s)} [${kind}]`).toBe(true);
      }
    }
  });

  it("leaves code context verbatim", () => {
    for (const s of SAMPLES) expect(escapeRich(s, "code")).toBe(s);
  });
});

describe("escapeHtml — fuzz", () => {
  it("emits no raw < or >, and only valid entities", () => {
    const badAmp = /&(?!(amp|lt|gt|quot|#\d+|#x[0-9a-fA-F]+);)/;
    for (const s of SAMPLES) {
      for (const kind of KINDS) {
        const escaped = escapeHtml(s, kind);
        expect(escaped.includes("<"), JSON.stringify(s)).toBe(false);
        expect(escaped.includes(">"), JSON.stringify(s)).toBe(false);
        expect(badAmp.test(escaped), JSON.stringify(s)).toBe(false);
      }
    }
  });
});
