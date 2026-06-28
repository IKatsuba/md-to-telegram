import { describe, expect, it } from "vitest";
import { validateRichMarkdown } from "../../src/index.js";

describe("validateRichMarkdown", () => {
  it("returns no warnings within limits", () => {
    expect(validateRichMarkdown("# Title\n\n- a\n- b")).toEqual([]);
  });

  it("flags text over 32768 characters", () => {
    const warnings = validateRichMarkdown("x".repeat(40000));
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ kind: "length", limit: 32768, actual: 40000 });
  });

  it("flags tables with more than 20 columns", () => {
    const header = `| ${Array.from({ length: 25 }, (_, i) => `c${i}`).join(" | ")} |`;
    const delim = `| ${Array.from({ length: 25 }, () => "---").join(" | ")} |`;
    const body = `| ${Array.from({ length: 25 }, () => "1").join(" | ")} |`;
    const warnings = validateRichMarkdown(`${header}\n${delim}\n${body}`);
    expect(warnings.some((w) => w.kind === "columns" && w.actual === 25)).toBe(true);
  });

  it("flags more than 50 media attachments", () => {
    const md = Array.from({ length: 51 }, (_, i) => `![](https://x/${i}.png)`).join("\n\n");
    expect(validateRichMarkdown(md).some((w) => w.kind === "media")).toBe(true);
  });

  it("flags more than 500 blocks", () => {
    const md = Array.from({ length: 510 }, (_, i) => `paragraph ${i}`).join("\n\n");
    expect(validateRichMarkdown(md).some((w) => w.kind === "blocks")).toBe(true);
  });
});
