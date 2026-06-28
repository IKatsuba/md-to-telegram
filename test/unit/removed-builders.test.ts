import { describe, expect, it } from "vitest";
import {
  buildFootnoteRemoved,
  buildHtmlRemoved,
  buildImageRemoved,
  buildMathRemoved,
  htmlTagName,
  plainText,
  positionOf,
} from "../../src/core/removed.js";
import type { SourcePosition } from "../../src/types.js";

const POS: SourcePosition = {
  start: { line: 1, column: 2, offset: 3 },
  end: { line: 4, column: 5, offset: 6 },
};

describe("buildImageRemoved", () => {
  it("includes optional title and position only when present", () => {
    const full = buildImageRemoved({ url: "u", alt: "a", title: "t", position: POS });
    expect(full).toEqual({ kind: "image", url: "u", alt: "a", title: "t", position: POS });

    const bare = buildImageRemoved({ url: "u", alt: "a" });
    expect(bare).toEqual({ kind: "image", url: "u", alt: "a" });
    expect("title" in bare).toBe(false);
    expect("position" in bare).toBe(false);
  });
});

describe("buildMathRemoved", () => {
  it("carries inline flag and omits absent position", () => {
    expect(buildMathRemoved({ value: "v", inline: true, position: POS })).toEqual({
      kind: "math",
      value: "v",
      inline: true,
      position: POS,
    });
    const bare = buildMathRemoved({ value: "v", inline: false });
    expect(bare).toEqual({ kind: "math", value: "v", inline: false });
    expect("position" in bare).toBe(false);
  });
});

describe("buildFootnoteRemoved", () => {
  it("includes optional label/value/position only when present", () => {
    const full = buildFootnoteRemoved({
      identifier: "1",
      variant: "definition",
      label: "1",
      value: "note",
      position: POS,
    });
    expect(full).toEqual({
      kind: "footnote",
      identifier: "1",
      variant: "definition",
      label: "1",
      value: "note",
      position: POS,
    });

    const bare = buildFootnoteRemoved({ identifier: "x", variant: "reference" });
    expect(bare).toEqual({ kind: "footnote", identifier: "x", variant: "reference" });
    expect("label" in bare).toBe(false);
    expect("value" in bare).toBe(false);
    expect("position" in bare).toBe(false);
  });
});

describe("buildHtmlRemoved", () => {
  it("includes optional tagName/position only when present", () => {
    const full = buildHtmlRemoved({ value: "<x>", scope: "inline", tagName: "x", position: POS });
    expect(full).toEqual({
      kind: "html",
      value: "<x>",
      scope: "inline",
      tagName: "x",
      position: POS,
    });
    const bare = buildHtmlRemoved({ value: "<!-- -->", scope: "block" });
    expect(bare).toEqual({ kind: "html", value: "<!-- -->", scope: "block" });
    expect("tagName" in bare).toBe(false);
    expect("position" in bare).toBe(false);
  });
});

describe("htmlTagName", () => {
  it.each([
    ["<sub>", "sub"],
    ["</div>", "div"],
    ["<TG-Emoji id=1>", "tg-emoji"],
    ["  <span>", "span"],
  ])("parses %s", (input, expected) => {
    expect(htmlTagName(input)).toBe(expected);
  });

  it.each(["<!-- comment -->", "<123>", "plain text", "<>"])(
    "returns undefined for %s",
    (input) => {
      expect(htmlTagName(input)).toBeUndefined();
    },
  );
});

describe("positionOf", () => {
  it("maps a full position incl. offset", () => {
    expect(positionOf({ position: POS })).toEqual(POS);
  });

  it("omits offset when the source point lacks it", () => {
    const r = positionOf({ position: { start: { line: 1, column: 2 }, end: { line: 3, column: 4 } } });
    expect(r).toEqual({ start: { line: 1, column: 2 }, end: { line: 3, column: 4 } });
    expect("offset" in r!.start).toBe(false);
  });

  it("returns undefined when there is no position", () => {
    expect(positionOf({})).toBeUndefined();
  });
});

describe("plainText", () => {
  it("extracts text from a node", () => {
    expect(plainText({ type: "text", value: "hello" })).toBe("hello");
  });
});
