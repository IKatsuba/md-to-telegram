/**
 * Public type surface for `md-to-telegram`.
 *
 * These types deliberately do NOT depend on `mdast`/`unist`, so the published
 * `.d.ts` stays free of internal AST types.
 */

/** Target Telegram parse mode. */
export type TelegramFormat = "html" | "markdownv2";

/** 1-based line/column source location (mirrors a unist Point, owned by us). */
export interface SourcePoint {
  line: number;
  column: number;
  offset?: number;
}

/** Source span in the original Markdown. */
export interface SourcePosition {
  start: SourcePoint;
  end: SourcePoint;
}

/* ----------------------- Removed / unsupported constructs ------------------ */

/** Discriminator values for {@link RemovedItem}. */
export type RemovedKind = "image" | "math" | "footnote" | "html";

/** An image (`![alt](url)`) — Telegram has no inline image in formatted text. */
export interface RemovedImage {
  readonly kind: "image";
  readonly url: string;
  readonly alt: string;
  readonly title?: string;
  readonly position?: SourcePosition;
}

/** LaTeX math (`$…$` inline or `$$…$$` block) — Telegram has no math rendering. */
export interface RemovedMath {
  readonly kind: "math";
  /** Raw LaTeX source, without the `$`/`$$` delimiters. */
  readonly value: string;
  /** `true` for inline `$…$`, `false` for block `$$…$$`. */
  readonly inline: boolean;
  readonly position?: SourcePosition;
}

/** A footnote reference (`[^1]`) or definition (`[^1]: …`). */
export interface RemovedFootnote {
  readonly kind: "footnote";
  readonly identifier: string;
  readonly label?: string;
  readonly variant: "reference" | "definition";
  /** Note body (present for definitions). */
  readonly value?: string;
  readonly position?: SourcePosition;
}

/** Raw HTML with no Telegram-supported equivalent. */
export interface RemovedHtml {
  readonly kind: "html";
  readonly value: string;
  /** Lowercased tag name when parseable (e.g. `"sub"`, `"div"`). */
  readonly tagName?: string;
  readonly scope: "inline" | "block";
  readonly position?: SourcePosition;
}

/** A construct that had no faithful Telegram analog and was dropped/degraded. */
export type RemovedItem = RemovedImage | RemovedMath | RemovedFootnote | RemovedHtml;

/* --------------------------------- Options -------------------------------- */

/** How to render GFM tables. */
export type TableStrategy = "pre" | "remove";
/** How to degrade images. */
export type ImageStrategy = "remove" | "link";
/** How to degrade LaTeX math. */
export type MathStrategy = "remove" | "raw";
/** How to handle footnotes. */
export type FootnoteStrategy = "remove" | "inline" | "append";

/** Options shared by every conversion (no target format). */
export interface FormatOptions {
  /** Render GFM tables as a fixed-width block, or drop them. Default `"pre"`. */
  tables?: TableStrategy;
  /** Thematic break (`---`) rendering: a literal string, or `"blank"` for an empty line. Default a line of `─`. */
  thematicBreak?: string | "blank";
  /** Flatten nested blockquotes to one level (Telegram can't nest them). Default `true`. */
  flattenBlockquotes?: boolean;
  /** How to degrade images. Default `"remove"` (still reported in `removed`). */
  images?: ImageStrategy;
  /** How to degrade LaTeX math. Default `"remove"`. */
  math?: MathStrategy;
  /** How to handle footnotes. Default `"remove"`. */
  footnotes?: FootnoteStrategy;
  /** Collect removed constructs into `result.removed`. Default `true`. */
  collectRemoved?: boolean;
  /** Spaces of indentation per nested-list level. Default `3`. */
  listIndent?: number;
}

/** Full options for {@link convert} (format required). */
export interface ConvertOptions extends FormatOptions {
  format: TelegramFormat;
}

/* --------------------------------- Result --------------------------------- */

/** The outcome of a conversion. */
export interface TelegramResult {
  /** The rendered string, ready to send with the matching `parse_mode`. */
  readonly text: string;
  /** The format this text targets (echoes the requested format). */
  readonly format: TelegramFormat;
  /** Constructs that had no faithful Telegram analog and were dropped/degraded. */
  readonly removed: readonly RemovedItem[];
}

/* --------------------------------- Prompt --------------------------------- */

/** Whether the generated prompt reads as a system message or an inline instruction. */
export type PromptStyle = "system" | "instruction";

/** Options for {@link buildTelegramPrompt}. */
export interface PromptOptions {
  format: TelegramFormat;
  /** Frame the prompt as a system message vs an inline instruction. Default `"system"`. */
  style?: PromptStyle;
  /** Include worked before/after examples. Default `true`. */
  includeExamples?: boolean;
}
