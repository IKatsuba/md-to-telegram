import { describe, expect, it } from "vitest";
import { layoutTable } from "../../src/core/indirect/table.js";

describe("layoutTable", () => {
  it("returns empty string for no rows", () => {
    expect(layoutTable([], [])).toBe("");
  });

  it("pads left and right aligned columns to the widest cell", () => {
    const out = layoutTable(
      [
        ["a", "bb"],
        ["ccc", "d"],
      ],
      ["left", "right"],
    );
    // col0 width 3 (ccc), col1 width 2 (bb)
    expect(out).toBe("a   │ bb\n────┼───\nccc │  d");
  });

  it("center-aligns with the extra space on the right", () => {
    const out = layoutTable([["ab"], ["wxyz"]], ["center"]);
    // width 4; "ab" -> gap 2 -> 1 left, 1 right
    expect(out).toBe(" ab \n────\nwxyz");
  });

  it("treats null alignment as left and fills ragged rows", () => {
    const out = layoutTable([["a", "b"], ["1"]], [null, null]);
    expect(out).toBe("a │ b\n──┼──\n1 │  ");
  });
});
