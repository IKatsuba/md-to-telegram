import type { Nodes } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Point, Position } from "unist";
import type {
  RemovedFootnote,
  RemovedHtml,
  RemovedImage,
  RemovedMath,
  SourcePoint,
  SourcePosition,
} from "../types.js";

function toPoint(p: Point): SourcePoint {
  return p.offset === undefined
    ? { line: p.line, column: p.column }
    : { line: p.line, column: p.column, offset: p.offset };
}

/** Convert an mdast node's position to our public {@link SourcePosition}. */
export function positionOf(node: { position?: Position | undefined }): SourcePosition | undefined {
  const pos = node.position;
  if (!pos) return undefined;
  return { start: toPoint(pos.start), end: toPoint(pos.end) };
}

/** Recursively extract plain text from a node, dropping all formatting. */
export function plainText(node: Nodes): string {
  return mdastToString(node);
}

/** Parse the leading tag name from a raw HTML string (e.g. `<sub>` → `"sub"`). */
export function htmlTagName(value: string): string | undefined {
  const match = /^<\/?([a-zA-Z][\w-]*)/.exec(value.trim());
  return match ? match[1]!.toLowerCase() : undefined;
}

/* ------------------------- typed builders (handle optionals) -------------- */

export function buildImageRemoved(opts: {
  url: string;
  alt: string;
  title?: string | undefined;
  position?: SourcePosition | undefined;
}): RemovedImage {
  return {
    kind: "image",
    url: opts.url,
    alt: opts.alt,
    ...(opts.title !== undefined ? { title: opts.title } : {}),
    ...(opts.position !== undefined ? { position: opts.position } : {}),
  };
}

export function buildMathRemoved(opts: {
  value: string;
  inline: boolean;
  position?: SourcePosition | undefined;
}): RemovedMath {
  return {
    kind: "math",
    value: opts.value,
    inline: opts.inline,
    ...(opts.position !== undefined ? { position: opts.position } : {}),
  };
}

export function buildFootnoteRemoved(opts: {
  identifier: string;
  variant: "reference" | "definition";
  label?: string | undefined;
  value?: string | undefined;
  position?: SourcePosition | undefined;
}): RemovedFootnote {
  return {
    kind: "footnote",
    identifier: opts.identifier,
    variant: opts.variant,
    ...(opts.label !== undefined ? { label: opts.label } : {}),
    ...(opts.value !== undefined ? { value: opts.value } : {}),
    ...(opts.position !== undefined ? { position: opts.position } : {}),
  };
}

export function buildHtmlRemoved(opts: {
  value: string;
  scope: "inline" | "block";
  tagName?: string | undefined;
  position?: SourcePosition | undefined;
}): RemovedHtml {
  return {
    kind: "html",
    value: opts.value,
    scope: opts.scope,
    ...(opts.tagName !== undefined ? { tagName: opts.tagName } : {}),
    ...(opts.position !== undefined ? { position: opts.position } : {}),
  };
}
