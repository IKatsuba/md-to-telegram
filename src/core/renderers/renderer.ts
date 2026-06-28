import type { TelegramFormat } from "../../types.js";
import type { EscapeKind } from "../escape.js";

/**
 * A rendering strategy. The shared tree-walk handles recursion, nesting rules,
 * and removed-node detection; a `Renderer` only produces leaf strings and
 * applies per-format, per-context escaping.
 *
 * Every method receives already-rendered (and already-escaped) child strings,
 * except `text`, `inlineCode`, `codeBlock`, and the `url` of `link`, which
 * receive raw values and escape them internally.
 */
export interface Renderer {
  readonly format: TelegramFormat;
  /** Escape and emit a run of plain text. */
  text(value: string, kind?: EscapeKind): string;
  bold(inner: string): string;
  italic(inner: string): string;
  underline(inner: string): string;
  strike(inner: string): string;
  spoiler(inner: string): string;
  /** Inline fixed-width code (raw value escaped per code-context). */
  inlineCode(value: string): string;
  /** Inline link; `inner` is rendered link text, `url` raw. */
  link(inner: string, url: string): string;
  /** Fenced/indented code block (raw value escaped per code-context). */
  codeBlock(value: string, lang?: string): string;
  /** Blockquote wrapping already-rendered inner block content. */
  blockquote(inner: string, expandable: boolean): string;
  /** A line break inside inline content. */
  hardBreak(): string;
}
