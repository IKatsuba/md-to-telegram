import type { List, ListItem, PhrasingContent, Root, RootContent, Table } from "mdast";
import { stripExpandableMarker } from "../directives.js";
import { escapeHtml, escapeRich } from "../escape.js";
import type { DefinitionTarget } from "../parse.js";

export interface RichSerializeOptions {
  /** `<summary>` label for an expandable (`[!expandable]`) blockquote. */
  expandableSummary: string;
}

interface RichCtx {
  definitions: Map<string, DefinitionTarget>;
  options: RichSerializeOptions;
}

/** Serialize an mdast tree to Telegram **Rich Markdown** (the `InputRichMessage.markdown`). */
export function serializeRich(
  root: Root,
  definitions: Map<string, DefinitionTarget>,
  options: RichSerializeOptions,
): string {
  return serializeFlow(root.children, { definitions, options });
}

/* --------------------------------- blocks --------------------------------- */

function serializeFlow(nodes: readonly RootContent[], ctx: RichCtx): string {
  const parts: string[] = [];
  for (const node of nodes) {
    const block = serializeBlock(node, ctx);
    if (block !== "") parts.push(block);
  }
  return parts.join("\n\n");
}

function serializeBlock(node: RootContent, ctx: RichCtx): string {
  switch (node.type) {
    case "heading":
      return `${"#".repeat(node.depth)} ${serializeInline(node.children, ctx)}`;
    case "paragraph":
      return serializeParagraph(node.children, ctx);
    case "thematicBreak":
      return "---";
    case "blockquote": {
      const expandable = stripExpandableMarker(node);
      const inner = serializeFlow(node.children, ctx);
      const quoted = inner
        .split("\n")
        .map((line) => (line === "" ? ">" : `> ${line}`))
        .join("\n");
      if (expandable) {
        const summary = escapeHtml(ctx.options.expandableSummary);
        // Markdown is parsed inside <details>, so the inner stays a real (collapsible) quote.
        return `<details><summary>${summary}</summary>\n\n${quoted}\n\n</details>`;
      }
      return quoted;
    }
    case "code":
      return fencedCode(node.value, node.lang ?? "");
    case "math":
      return `$$\n${node.value}\n$$`;
    case "list":
      return serializeList(node, ctx);
    case "table":
      return serializeTable(node, ctx);
    case "footnoteDefinition": {
      const body = serializeFlow(node.children, ctx).replace(/\n+/g, " ").trim();
      return `[^${node.identifier}]: ${body}`;
    }
    case "html":
      return node.value;
    case "definition":
      return "";
    default:
      return serializeInline([node as PhrasingContent], ctx);
  }
}

function serializeParagraph(children: readonly PhrasingContent[], ctx: RichCtx): string {
  // Media must be its own block, so split the paragraph around images.
  const blocks: string[] = [];
  let buf = "";
  for (const child of children) {
    const img = asImage(child, ctx);
    if (img) {
      if (buf.trim() !== "") blocks.push(buf);
      buf = "";
      blocks.push(imageMarkup(img));
    } else {
      buf += serializeInlineNode(child, ctx);
    }
  }
  if (buf.trim() !== "") blocks.push(buf);
  return blocks.join("\n\n");
}

/* ---------------------------------- lists --------------------------------- */

function serializeList(node: List, ctx: RichCtx): string {
  const ordered = node.ordered === true;
  const start = node.start ?? 1;
  const lines: string[] = [];
  node.children.forEach((item, i) => {
    const marker =
      item.checked === true
        ? "- [x] "
        : item.checked === false
          ? "- [ ] "
          : ordered
            ? `${start + i}. `
            : "- ";
    lines.push(serializeListItem(item, ctx, marker));
  });
  return lines.join("\n");
}

function serializeListItem(
  item: ListItem,
  ctx: RichCtx,
  marker: string,
): string {
  const indent = " ".repeat(marker.length);
  let lead = "";
  let leadDone = false;
  const after: string[] = [];
  for (const child of item.children) {
    if (child.type === "list") {
      after.push(indentLines(serializeList(child, ctx), indent));
    } else if (child.type === "paragraph" && !leadDone) {
      lead = serializeInline(child.children, ctx);
      leadDone = true;
    } else {
      const block = serializeBlock(child, ctx);
      if (block !== "") after.push(indentLines(block, indent));
    }
  }
  let out = marker + lead;
  if (after.length > 0) out += `\n${after.join("\n")}`;
  return out;
}

function indentLines(text: string, indent: string): string {
  return text
    .split("\n")
    .map((line) => indent + line)
    .join("\n");
}

/* --------------------------------- tables --------------------------------- */

function serializeTable(node: Table, ctx: RichCtx): string {
  const align = node.align ?? [];
  const rows = node.children.map((row) =>
    row.children.map((cell) => serializeInline(cell.children, ctx).replace(/\n/g, " ")),
  );
  const cols = Math.max(0, ...rows.map((r) => r.length));
  const delim: string[] = [];
  for (let c = 0; c < cols; c++) {
    const a = align[c];
    delim.push(a === "left" ? ":--" : a === "center" ? ":-:" : a === "right" ? "--:" : "---");
  }
  const renderRow = (cells: string[]): string => {
    const padded = Array.from({ length: cols }, (_, c) => cells[c] ?? "");
    return `| ${padded.join(" | ")} |`;
  };
  const [header, ...body] = rows;
  const lines = [renderRow(header ?? []), `| ${delim.join(" | ")} |`];
  for (const row of body) lines.push(renderRow(row));
  return lines.join("\n");
}

/* --------------------------------- inline --------------------------------- */

function serializeInline(nodes: readonly PhrasingContent[], ctx: RichCtx): string {
  let out = "";
  for (const node of nodes) out += serializeInlineNode(node, ctx);
  return out;
}

function serializeInlineNode(node: PhrasingContent, ctx: RichCtx): string {
  switch (node.type) {
    case "text":
      return escapeRich(node.value, "normal");
    case "strong":
      return `**${serializeInline(node.children, ctx)}**`;
    case "emphasis":
      return `*${serializeInline(node.children, ctx)}*`;
    case "underline":
      return `<u>${serializeInline(node.children, ctx)}</u>`;
    case "delete":
      return `~~${serializeInline(node.children, ctx)}~~`;
    case "spoiler":
      return `||${serializeInline(node.children, ctx)}||`;
    case "inlineCode":
      return inlineCode(node.value);
    case "inlineMath":
      return `$${node.value}$`;
    case "break":
      return "\\\n";
    case "link": {
      const inner = serializeInline(node.children, ctx);
      return `[${inner}](${escapeRich(node.url, "linkUrl")}${title(node.title)})`;
    }
    case "linkReference": {
      const def = ctx.definitions.get(node.identifier);
      const inner = serializeInline(node.children, ctx);
      if (!def) return inner;
      return `[${inner}](${escapeRich(def.url, "linkUrl")}${title(def.title)})`;
    }
    case "image":
    case "imageReference": {
      const img = asImage(node, ctx);
      return img ? imageMarkup(img) : "";
    }
    case "footnoteReference":
      return `[^${node.identifier}]`;
    case "html":
      return node.value;
    default:
      return "";
  }
}

/* --------------------------------- helpers -------------------------------- */

interface ImageInfo {
  alt: string;
  url: string;
  title?: string | undefined;
}

function asImage(node: PhrasingContent, ctx: RichCtx): ImageInfo | null {
  if (node.type === "image") {
    return { alt: node.alt ?? "", url: node.url, title: node.title ?? undefined };
  }
  if (node.type === "imageReference") {
    const def = ctx.definitions.get(node.identifier);
    return { alt: node.alt ?? "", url: def?.url ?? "", title: def?.title };
  }
  return null;
}

function imageMarkup(img: ImageInfo): string {
  const alt = img.alt.replace(/]/g, "\\]").replace(/\n/g, " ");
  return `![${alt}](${escapeRich(img.url, "linkUrl")}${title(img.title)})`;
}

function title(value: string | null | undefined): string {
  return value ? ` "${value.replace(/"/g, '\\"')}"` : "";
}

function inlineCode(value: string): string {
  const longest = (value.match(/`+/g) ?? []).reduce((m, r) => Math.max(m, r.length), 0);
  const fence = "`".repeat(longest + 1);
  const pad = value.startsWith("`") || value.endsWith("`") ? " " : "";
  return `${fence}${pad}${value}${pad}${fence}`;
}

function fencedCode(value: string, lang: string): string {
  const longest = (value.match(/`+/g) ?? []).reduce((m, r) => Math.max(m, r.length), 0);
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}${lang.trim()}\n${value}\n${fence}`;
}
