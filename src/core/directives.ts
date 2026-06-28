import type { Parent, PhrasingContent, Root, Text } from "mdast";

/**
 * Telegram-only inline directives that have no standard-Markdown syntax.
 * We add small extensions the LLM can use and `convert` understands:
 * - spoiler:   `||text||`
 * - underline: `++text++`
 * (expandable blockquotes are handled in the walk via a `> [!expandable]` marker.)
 */
export interface Spoiler extends Parent {
  type: "spoiler";
  children: PhrasingContent[];
}
export interface Underline extends Parent {
  type: "underline";
  children: PhrasingContent[];
}

declare module "mdast" {
  interface PhrasingContentMap {
    spoiler: Spoiler;
    underline: Underline;
  }
  interface RootContentMap {
    spoiler: Spoiler;
    underline: Underline;
  }
}

type Tok = { t: "txt"; v: string } | { t: "mark" } | { t: "node"; n: PhrasingContent };

function text(value: string): Text {
  return { type: "text", value };
}

function toksToNodes(toks: readonly Tok[], marker: string): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  for (const tok of toks) {
    if (tok.t === "txt") {
      if (tok.v !== "") out.push(text(tok.v));
    } else if (tok.t === "node") {
      out.push(tok.n);
    } else {
      out.push(text(marker));
    }
  }
  return out;
}

/** Wrap `marker … marker` spans in `make(...)`, with simple flanking rules. */
function applyDelimiter(
  nodes: readonly PhrasingContent[],
  marker: string,
  make: (children: PhrasingContent[]) => PhrasingContent,
): PhrasingContent[] {
  const toks: Tok[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      const parts = node.value.split(marker);
      for (let i = 0; i < parts.length; i++) {
        if (i > 0) toks.push({ t: "mark" });
        // Skip empty segments so flanking sees the real neighbor (e.g. an
        // adjacent node) instead of an empty text token.
        if (parts[i] !== "") toks.push({ t: "txt", v: parts[i]! });
      }
    } else {
      toks.push({ t: "node", n: node });
    }
  }

  const canOpen = (k: number): boolean => {
    const next = toks[k + 1];
    if (!next) return false;
    if (next.t === "node") return true;
    return next.t === "txt" && next.v !== "" && !/^\s/.test(next.v);
  };
  const canClose = (k: number): boolean => {
    const prev = toks[k - 1];
    if (!prev) return false;
    if (prev.t === "node") return true;
    return prev.t === "txt" && prev.v !== "" && !/\s$/.test(prev.v);
  };

  const pair = new Map<number, number>();
  let open = -1;
  for (let k = 0; k < toks.length; k++) {
    if (toks[k]!.t !== "mark") continue;
    if (open >= 0 && canClose(k)) {
      pair.set(open, k);
      open = -1;
    } else if (canOpen(k)) {
      open = k;
    }
  }

  const out: PhrasingContent[] = [];
  for (let k = 0; k < toks.length; ) {
    const tok = toks[k]!;
    if (tok.t === "mark" && pair.has(k)) {
      const close = pair.get(k)!;
      const inner = toksToNodes(toks.slice(k + 1, close), marker);
      out.push(make(applyAll(inner)));
      k = close + 1;
    } else if (tok.t === "mark") {
      out.push(text(marker));
      k++;
    } else if (tok.t === "txt") {
      if (tok.v !== "") out.push(text(tok.v));
      k++;
    } else {
      out.push(tok.n);
      k++;
    }
  }
  return out;
}

function applyAll(nodes: readonly PhrasingContent[]): PhrasingContent[] {
  const underlined = applyDelimiter(nodes, "++", (children) => ({ type: "underline", children }));
  return applyDelimiter(underlined, "||", (children) => ({ type: "spoiler", children }));
}

const PHRASING_PARENTS = new Set<string>([
  "paragraph",
  "heading",
  "strong",
  "emphasis",
  "delete",
  "link",
  "tableCell",
]);

function transformNode(node: Parent): void {
  for (const child of node.children) {
    if ("children" in child && Array.isArray((child as Parent).children)) {
      transformNode(child as Parent);
    }
  }
  if (PHRASING_PARENTS.has(node.type)) {
    node.children = applyAll(node.children as PhrasingContent[]) as Parent["children"];
  }
}

/** Parse Telegram inline directives (spoiler, underline) into mdast nodes. */
export function transformDirectives(root: Root): Root {
  transformNode(root);
  return root;
}
