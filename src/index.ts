export { convert, toTelegramHTML, toTelegramMarkdownV2 } from "./convert.js";
export { buildTelegramPrompt } from "./prompt/index.js";

export type {
  TelegramFormat,
  TelegramResult,
  ConvertOptions,
  FormatOptions,
  PromptOptions,
  PromptStyle,
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
