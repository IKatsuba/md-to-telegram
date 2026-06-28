import type { FootnoteDefinition } from "mdast";
import type { RemovedItem } from "../types.js";
import type { NormalizedOptions } from "./options.js";
import type { DefinitionTarget } from "./parse.js";
import type { Renderer } from "./renderers/renderer.js";

/** Mutable state threaded through the tree-walk. */
export interface RenderContext {
  readonly renderer: Renderer;
  /** Shared, mutable collector — same reference across all child contexts. */
  readonly removed: RemovedItem[];
  readonly definitions: Map<string, DefinitionTarget>;
  readonly footnotes: Map<string, FootnoteDefinition>;
  readonly options: NormalizedOptions;
  /** >0 means we are already inside a blockquote (Telegram can't nest them). */
  readonly blockquoteDepth: number;
  /** Inside an inline link (suppress nested links). */
  readonly inLink: boolean;
  /** Current nested-list depth (0 at top level). */
  readonly listDepth: number;
}

/** Build the root context for a conversion. */
export function createContext(
  renderer: Renderer,
  definitions: Map<string, DefinitionTarget>,
  footnotes: Map<string, FootnoteDefinition>,
  options: NormalizedOptions,
): RenderContext {
  return {
    renderer,
    removed: [],
    definitions,
    footnotes,
    options,
    blockquoteDepth: 0,
    inLink: false,
    listDepth: 0,
  };
}

export function enterBlockquote(ctx: RenderContext): RenderContext {
  return { ...ctx, blockquoteDepth: ctx.blockquoteDepth + 1 };
}

export function enterLink(ctx: RenderContext): RenderContext {
  return { ...ctx, inLink: true };
}

export function enterList(ctx: RenderContext): RenderContext {
  return { ...ctx, listDepth: ctx.listDepth + 1 };
}
