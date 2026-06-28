import type { Definition, FootnoteDefinition, Root, RootContent } from "mdast";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified, type Processor } from "unified";

/** A resolved link/image reference target. */
export interface DefinitionTarget {
  url: string;
  title?: string;
}

let cachedProcessor: Processor<Root> | undefined;

/**
 * Resolve an ESM default export across build targets. When this package is
 * consumed from CJS, the dual-build interop can leave an ESM-only dependency's
 * default export wrapped one level deep (`{ default: fn }`); unwrap it.
 */
function interopDefault<T>(mod: T): T {
  return (typeof mod === "function" ? mod : (mod as { default?: T }).default) as T;
}

/** Build (once) a unified processor: CommonMark + GFM + LaTeX math. */
export function buildProcessor(): Processor<Root> {
  if (!cachedProcessor) {
    cachedProcessor = unified()
      .use(interopDefault(remarkParse))
      .use(interopDefault(remarkGfm))
      .use(interopDefault(remarkMath)) as unknown as Processor<Root>;
  }
  return cachedProcessor;
}

/** Parse Markdown into an mdast tree (synchronous, no transformers). */
export function parse(markdown: string): Root {
  return buildProcessor().parse(markdown);
}

/** Collect reference-style `[id]: url "title"` definitions into a lookup map. */
export function collectDefinitions(root: Root): Map<string, DefinitionTarget> {
  const map = new Map<string, DefinitionTarget>();
  const visit = (nodes: readonly RootContent[]): void => {
    for (const node of nodes) {
      if (node.type === "definition") {
        const def = node as Definition;
        map.set(def.identifier, def.title ? { url: def.url, title: def.title } : { url: def.url });
      }
      if ("children" in node && Array.isArray(node.children)) {
        visit(node.children as RootContent[]);
      }
    }
  };
  visit(root.children);
  return map;
}

/** Collect `[^id]: …` footnote definitions into a lookup map (by identifier). */
export function collectFootnotes(root: Root): Map<string, FootnoteDefinition> {
  const map = new Map<string, FootnoteDefinition>();
  const visit = (nodes: readonly RootContent[]): void => {
    for (const node of nodes) {
      if (node.type === "footnoteDefinition") {
        map.set(node.identifier, node);
      } else if ("children" in node && Array.isArray(node.children)) {
        visit(node.children as RootContent[]);
      }
    }
  };
  visit(root.children);
  return map;
}
