/**
 * Public type surface for `md-to-telegram`.
 *
 * These types deliberately do NOT depend on `mdast`/`unist`, so the published
 * `.d.ts` stays free of internal AST types.
 */

/**
 * Conversion target.
 * - `"html"` / `"markdownv2"` — classic `parse_mode` strings (fallback for clients
 *   without Rich Messages support).
 * - `"rich"` — the `markdown` field of `InputRichMessage` (Bot API 10.1 Rich Messages),
 *   which Telegram renders natively (headings, lists, tables, math, media, footnotes…).
 */
export type TelegramFormat = "html" | "markdownv2" | "rich";

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
  /**
   * `rich` only: the `<summary>` label for an expandable (`[!expandable]`) blockquote,
   * which is rendered as a collapsible `<details>`. Default `"Details"`.
   */
  expandableSummary?: string;
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

/* -------------------------------- Splitting ------------------------------- */

/** Options for {@link splitMessage}. */
export interface SplitOptions {
  /** Which format the text was rendered in (selects safe break rules). */
  format: TelegramFormat;
  /** Max length per part in UTF-16 code units. Default 4096 (html/markdownv2), 32768 (rich). */
  maxLength?: number;
}

/* ------------------------------ Rich limits ------------------------------- */

/** Which Rich Message limit a {@link RichLimitWarning} refers to. */
export type RichLimitKind = "length" | "blocks" | "nesting" | "media" | "columns";

/** A single Rich Message limit violation reported by `validateRichMarkdown`. */
export interface RichLimitWarning {
  readonly kind: RichLimitKind;
  /** The Telegram-imposed maximum. */
  readonly limit: number;
  /** The measured value that exceeded the limit. */
  readonly actual: number;
  /** Human-readable description. */
  readonly message: string;
}

/* --------------------------------- Prompt --------------------------------- */

/** Whether the generated prompt reads as a system message or an inline instruction. */
export type PromptStyle = "system" | "instruction";

/**
 * Which conversion target the prompt is written for.
 * - `"classic"` — HTML/MarkdownV2: forbids images, math, footnotes (no Telegram entity).
 * - `"rich"` — Rich Messages: those constructs are allowed (rendered natively).
 */
export type PromptTarget = "classic" | "rich";

/** Options for {@link buildTelegramPrompt}. */
export interface PromptOptions {
  /** Which target the model should write for. Default `"classic"`. */
  target?: PromptTarget;
  /** Frame the prompt as a system message vs an inline instruction. Default `"system"`. */
  style?: PromptStyle;
  /** Include a worked example. Default `true`. */
  includeExamples?: boolean;
}
