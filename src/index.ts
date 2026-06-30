export { convert, toTelegramHTML, toTelegramMarkdownV2, toTelegramRich } from "./convert.js";
export { validateRichMarkdown } from "./core/rich/limits.js";
export { splitMessage } from "./split.js";
export { buildTelegramPrompt } from "./prompt/index.js";

export type {
  TelegramFormat,
  TelegramResult,
  ConvertOptions,
  FormatOptions,
  PromptOptions,
  PromptStyle,
  PromptTarget,
  SplitOptions,
  RichLimitWarning,
  RichLimitKind,
  RemovedItem,
  RemovedKind,
  RemovedImage,
  RemovedMath,
  RemovedFootnote,
  RemovedHtml,
  TableStrategy,
  ImageStrategy,
  MathStrategy,
  FootnoteStrategy,
  SourcePosition,
  SourcePoint,
} from "./types.js";
