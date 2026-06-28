import { measureWidth } from "./width.js";

/** Column alignment as produced by remark-gfm (`null` = default/left). */
export type Align = "left" | "right" | "center" | null;

function pad(cell: string, width: number, align: Align): string {
  const gap = Math.max(0, width - measureWidth(cell));
  if (align === "right") return " ".repeat(gap) + cell;
  if (align === "center") {
    const left = Math.floor(gap / 2);
    return " ".repeat(left) + cell + " ".repeat(gap - left);
  }
  return cell + " ".repeat(gap);
}

/**
 * Lay out a table as a fixed-width monospace block (the body that goes inside a
 * `pre`/code block). The first row is treated as the header and gets a separator.
 */
export function layoutTable(rows: readonly string[][], align: readonly Align[]): string {
  if (rows.length === 0) return "";
  const cols = Math.max(...rows.map((r) => r.length));
  const widths: number[] = [];
  for (let c = 0; c < cols; c++) {
    widths[c] = Math.max(0, ...rows.map((r) => measureWidth(r[c] ?? "")));
  }

  const renderRow = (row: readonly string[]): string =>
    widths.map((w, c) => pad(row[c] ?? "", w, align[c] ?? null)).join(" │ ");

  const lines: string[] = [];
  const [header, ...body] = rows;
  lines.push(renderRow(header!));
  lines.push(widths.map((w) => "─".repeat(w)).join("─┼─"));
  for (const row of body) lines.push(renderRow(row));
  return lines.join("\n");
}
