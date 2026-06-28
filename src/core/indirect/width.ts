/**
 * Approximate the rendered column width of a string in a monospace context.
 *
 * Telegram renders `pre`/code in a monospace font where CJK and most emoji
 * occupy two cells. We don't pull in a heavy dependency; this heuristic covers
 * the common ranges well enough for table alignment (a best-effort feature).
 */
export function measureWidth(value: string): number {
  let width = 0;
  for (const ch of value) {
    const cp = ch.codePointAt(0)!;
    width += isWide(cp) ? 2 : isZeroWidth(cp) ? 0 : 1;
  }
  return width;
}

function isZeroWidth(cp: number): boolean {
  return (
    cp === 0x200d || // zero-width joiner
    (cp >= 0x0300 && cp <= 0x036f) || // combining diacritics
    cp === 0xfe0f || // variation selector-16
    cp === 0xfe0e
  );
}

function isWide(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK radicals, Kangxi
    (cp >= 0x3041 && cp <= 0x33ff) || // Hiragana, Katakana, CJK symbols
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Ext A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified
    (cp >= 0xa000 && cp <= 0xa4cf) || // Yi
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility
    (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK Compatibility Forms
    (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth Forms
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) || // emoji & pictographs
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK Ext B+
  );
}
