import { describe, expect, it } from "vitest";
import { measureWidth } from "../../src/core/indirect/width.js";

// Mirror of the wide ranges in width.ts — the spec the implementation must match.
const WIDE_RANGES: [number, number][] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe4f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1faff],
  [0x20000, 0x3fffd],
];
const ZERO = new Set([0x200d, 0xfe0f, 0xfe0e]);

function isWide(cp: number): boolean {
  return WIDE_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);
}
function isZero(cp: number): boolean {
  return ZERO.has(cp) || (cp >= 0x0300 && cp <= 0x036f);
}
function expected(cp: number): number {
  return isWide(cp) ? 2 : isZero(cp) ? 0 : 1;
}

// Probe every range boundary (±1) plus zero-width and ascii points.
const PROBES: number[] = [
  0x20, 0x41, 0x7e, 0xc4, 0x44f, 0x627, // narrow samples
  0x200d, 0xfe0f, 0xfe0e, 0x0300, 0x036f, 0x02ff, 0x0370, // zero-width + their edges
];
for (const [lo, hi] of WIDE_RANGES) PROBES.push(lo - 1, lo, hi, hi + 1);

describe("measureWidth — matches the wide/zero-width spec at every boundary", () => {
  it.each(PROBES.filter((cp) => cp >= 0 && cp <= 0x10ffff && !(cp >= 0xd800 && cp <= 0xdfff)))(
    "code point 0x%s",
    (cp) => {
      expect(measureWidth(String.fromCodePoint(cp))).toBe(expected(cp));
    },
  );

  it("sums widths across a mixed string", () => {
    // 'a'(1) + CJK(2) + combining(0) + emoji(2) = 5
    const mixed = `a${String.fromCodePoint(0x4e2d, 0x0301, 0x1f600)}`;
    expect(measureWidth(mixed)).toBe(5);
    expect(measureWidth("")).toBe(0);
  });
});
