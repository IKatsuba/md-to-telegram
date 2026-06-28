import type {
  FootnoteReference,
  Html,
  List,
  ListItem,
  PhrasingContent,
  RootContent,
  Table,
} from "mdast";
import { type RenderContext, enterBlockquote, enterLink, enterList } from "./context.js";
import { normalizeLanguage } from "./data/languages.js";
import type { Align } from "./indirect/table.js";
import { layoutTable } from "./indirect/table.js";
import {
  buildFootnoteRemoved,
  buildHtmlRemoved,
  buildImageRemoved,
  buildMathRemoved,
  htmlTagName,
  plainText,
  positionOf,
} from "./removed.js";

/** Render a list of inline (phrasing) nodes, concatenated. */
export function renderInline(nodes: readonly PhrasingContent[], ctx: RenderContext): string {
  let out = "";
  for (const node of nodes) {
    out += node.type === "html" ? renderHtml(ctx, node, "inline") : renderNode(node, ctx);
  }
  return out;
}

/** Render a list of block (flow) nodes, joined by `sep`, dropping empties. */
export function renderFlow(
  nodes: readonly RootContent[],
  ctx: RenderContext,
  sep = "\n\n",
): string {
  const parts: string[] = [];
  for (const node of nodes) {
    const rendered = node.type === "html" ? renderHtml(ctx, node, "block") : renderNode(node, ctx);
    if (rendered !== "") parts.push(rendered);
  }
  return parts.join(sep);
}

/** Dispatch a single node to the renderer. */
export function renderNode(node: RootContent, ctx: RenderContext): string {
  const r = ctx.renderer;
  switch (node.type) {
    case "text":
      return r.text(node.value, "normal");
    case "strong":
      return r.bold(renderInline(node.children, ctx));
    case "emphasis":
      return r.italic(renderInline(node.children, ctx));
    case "delete":
      return r.strike(renderInline(node.children, ctx));
    case "inlineCode":
      return r.inlineCode(node.value);
    case "break":
      return r.hardBreak();
    case "paragraph":
      return renderInline(node.children, ctx);
    case "heading":
      return r.bold(renderInline(node.children, ctx));
    case "code":
      return r.codeBlock(node.value, normalizeLanguage(node.lang));
    case "thematicBreak":
      return ctx.options.thematicBreak;
    case "blockquote": {
      const inner = renderFlow(node.children, enterBlockquote(ctx), "\n");
      if (ctx.blockquoteDepth > 0 && ctx.options.flattenBlockquotes) return inner;
      return r.blockquote(inner, false);
    }
    case "list":
      return renderList(node, ctx);
    case "link": {
      if (ctx.inLink) return renderInline(node.children, ctx);
      return r.link(renderInline(node.children, enterLink(ctx)), node.url);
    }
    case "linkReference": {
      const def = ctx.definitions.get(node.identifier);
      if (!def || ctx.inLink) return renderInline(node.children, ctx);
      return r.link(renderInline(node.children, enterLink(ctx)), def.url);
    }
    case "image":
      return renderImage(ctx, node.url, node.alt ?? "", node.title ?? undefined, positionOf(node));
    case "imageReference": {
      const def = ctx.definitions.get(node.identifier);
      return renderImage(ctx, def?.url ?? "", node.alt ?? "", def?.title, positionOf(node));
    }
    case "inlineMath":
      return renderMath(ctx, node.value, true, positionOf(node));
    case "math":
      return renderMath(ctx, node.value, false, positionOf(node));
    case "footnoteReference":
      return renderFootnoteRef(ctx, node);
    case "footnoteDefinition": {
      if (ctx.options.collectRemoved) {
        ctx.removed.push(
          buildFootnoteRemoved({
            identifier: node.identifier,
            variant: "definition",
            label: node.label ?? undefined,
            value: plainText(node),
            position: positionOf(node),
          }),
        );
      }
      return "";
    }
    case "table":
      return renderTable(ctx, node);
    case "html":
      return renderHtml(ctx, node, "block");
    case "definition":
    case "yaml":
    case "listItem":
    case "tableRow":
    case "tableCell":
      return "";
    default:
      return "";
  }
}

/* --------------------------------- lists ---------------------------------- */

function renderList(node: List, ctx: RenderContext): string {
  const indent = " ".repeat(ctx.options.listIndent * ctx.listDepth);
  const ordered = node.ordered === true;
  const start = node.start ?? 1;
  const dot = ctx.renderer.format === "markdownv2" ? "\\." : ".";
  const lines: string[] = [];
  node.children.forEach((item, i) => {
    const marker =
      item.checked === true
        ? "☑ "
        : item.checked === false
          ? "☐ "
          : ordered
            ? `${start + i}${dot} `
            : "• ";
    lines.push(renderListItem(item, ctx, marker, indent));
  });
  return lines.join("\n");
}

function renderListItem(
  item: ListItem,
  ctx: RenderContext,
  marker: string,
  indent: string,
): string {
  const contIndent = indent + " ".repeat(ctx.options.listIndent);
  let lead = "";
  const after: string[] = [];
  item.children.forEach((child, i) => {
    if (child.type === "list") {
      after.push(renderList(child, enterList(ctx)));
    } else if (child.type === "paragraph" && i === 0) {
      lead = renderInline(child.children, ctx);
    } else {
      const block = renderNode(child, ctx);
      if (block !== "") after.push(indentBlock(block, contIndent));
    }
  });
  let line = indent + marker + lead;
  if (after.length > 0) line += `\n${after.join("\n")}`;
  return line;
}

function indentBlock(text: string, indent: string): string {
  return text
    .split("\n")
    .map((line) => indent + line)
    .join("\n");
}

/* --------------------------------- tables --------------------------------- */

function renderTable(ctx: RenderContext, node: Table): string {
  if (ctx.options.tables === "remove") return "";
  const align = (node.align ?? []) as Align[];
  const rows = node.children.map((row) => row.children.map((cell) => plainText(cell)));
  return ctx.renderer.codeBlock(layoutTable(rows, align));
}

/* ---------------------------- removed constructs --------------------------- */

function renderImage(
  ctx: RenderContext,
  url: string,
  alt: string,
  title: string | undefined,
  position: ReturnType<typeof positionOf>,
): string {
  if (ctx.options.collectRemoved) {
    ctx.removed.push(buildImageRemoved({ url, alt, title, position }));
  }
  if (ctx.options.images === "link") {
    return ctx.renderer.link(ctx.renderer.text(alt || url, "normal"), url);
  }
  return "";
}

function renderMath(
  ctx: RenderContext,
  value: string,
  inline: boolean,
  position: ReturnType<typeof positionOf>,
): string {
  if (ctx.options.collectRemoved) {
    ctx.removed.push(buildMathRemoved({ value, inline, position }));
  }
  if (ctx.options.math === "raw") {
    return inline ? ctx.renderer.inlineCode(value) : ctx.renderer.codeBlock(value);
  }
  return "";
}

function renderFootnoteRef(ctx: RenderContext, node: FootnoteReference): string {
  if (ctx.options.collectRemoved) {
    ctx.removed.push(
      buildFootnoteRemoved({
        identifier: node.identifier,
        variant: "reference",
        label: node.label ?? undefined,
        position: positionOf(node),
      }),
    );
  }
  if (ctx.options.footnotes === "inline") {
    const def = ctx.footnotes.get(node.identifier);
    if (def) {
      const inner = renderFlow(def.children, ctx, " ");
      return `${ctx.renderer.text(" (")}${inner}${ctx.renderer.text(")")}`;
    }
  }
  if (ctx.options.footnotes === "append") {
    return ctx.renderer.text(`[${node.label ?? node.identifier}]`, "normal");
  }
  return "";
}

function renderHtml(ctx: RenderContext, node: Html, scope: "inline" | "block"): string {
  if (ctx.options.collectRemoved) {
    ctx.removed.push(
      buildHtmlRemoved({
        value: node.value,
        scope,
        tagName: htmlTagName(node.value),
        position: positionOf(node),
      }),
    );
  }
  return "";
}
