import type {
  ConvertOptions,
  FootnoteStrategy,
  ImageStrategy,
  MathStrategy,
  TableStrategy,
} from "../types.js";

/** Options with every default resolved. */
export interface NormalizedOptions {
  tables: TableStrategy;
  thematicBreak: string;
  flattenBlockquotes: boolean;
  images: ImageStrategy;
  math: MathStrategy;
  footnotes: FootnoteStrategy;
  collectRemoved: boolean;
  listIndent: number;
}

const DEFAULT_THEMATIC_BREAK = "──────────";

/** Fill in defaults for any unspecified option. */
export function normalizeOptions(options: ConvertOptions): NormalizedOptions {
  const thematicBreak =
    options.thematicBreak === undefined
      ? DEFAULT_THEMATIC_BREAK
      : options.thematicBreak === "blank"
        ? ""
        : options.thematicBreak;
  return {
    tables: options.tables ?? "pre",
    thematicBreak,
    flattenBlockquotes: options.flattenBlockquotes ?? true,
    images: options.images ?? "remove",
    math: options.math ?? "remove",
    footnotes: options.footnotes ?? "remove",
    collectRemoved: options.collectRemoved ?? true,
    listIndent: options.listIndent ?? 3,
  };
}
