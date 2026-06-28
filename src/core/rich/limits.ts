import type { Nodes } from "mdast";
import type { RichLimitWarning } from "../../types.js";
import { parse } from "../parse.js";

/** Official Rich Message limits (Bot API 10.1). */
const LIMITS = {
  length: 32768,
  blocks: 500,
  nesting: 16,
  media: 50,
  columns: 20,
} as const;

const BLOCK_TYPES = new Set<string>([
  "heading",
  "paragraph",
  "code",
  "math",
  "blockquote",
  "list",
  "listItem",
  "table",
  "tableRow",
  "thematicBreak",
  "footnoteDefinition",
]);

const CONTAINER_TYPES = new Set<string>([
  "blockquote",
  "list",
  "listItem",
  "table",
  "tableRow",
  "footnoteDefinition",
]);

/**
 * Check Rich Markdown against the official Telegram limits. Read-only: it never
 * modifies or splits the text — it returns one {@link RichLimitWarning} per exceeded
 * limit (empty array when everything fits).
 */
export function validateRichMarkdown(markdown: string): RichLimitWarning[] {
  const warnings: RichLimitWarning[] = [];
  const length = [...markdown].length;
  if (length > LIMITS.length) {
    warnings.push(warn("length", LIMITS.length, length, "rich message text is too long"));
  }

  let blocks = 0;
  let media = 0;
  let columns = 0;
  let nesting = 0;

  const visit = (node: Nodes, depth: number): void => {
    if (BLOCK_TYPES.has(node.type)) blocks++;
    if (node.type === "image" || node.type === "imageReference") media++;
    if (node.type === "table") {
      for (const row of node.children) columns = Math.max(columns, row.children.length);
    }
    const nextDepth = CONTAINER_TYPES.has(node.type) ? depth + 1 : depth;
    nesting = Math.max(nesting, nextDepth);
    if ("children" in node) {
      for (const child of node.children) visit(child as Nodes, nextDepth);
    }
  };
  visit(parse(markdown), 0);

  if (blocks > LIMITS.blocks) warnings.push(warn("blocks", LIMITS.blocks, blocks, "too many blocks"));
  if (nesting > LIMITS.nesting) {
    warnings.push(warn("nesting", LIMITS.nesting, nesting, "blocks nested too deeply"));
  }
  if (media > LIMITS.media) warnings.push(warn("media", LIMITS.media, media, "too many media attachments"));
  if (columns > LIMITS.columns) {
    warnings.push(warn("columns", LIMITS.columns, columns, "a table has too many columns"));
  }
  return warnings;
}

function warn(
  kind: RichLimitWarning["kind"],
  limit: number,
  actual: number,
  message: string,
): RichLimitWarning {
  return { kind, limit, actual, message: `${message} (${actual} > ${limit})` };
}
