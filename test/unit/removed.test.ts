import { describe, expect, it } from "vitest";
import { toTelegramHTML } from "../../src/index.js";

describe("removed constructs", () => {
  it("reports images with a typed payload and drops them", () => {
    const { text, removed } = toTelegramHTML("![cat](https://x/c.png 'A cat')");
    expect(text).toBe("");
    expect(removed).toHaveLength(1);
    const img = removed[0]!;
    expect(img.kind).toBe("image");
    if (img.kind === "image") {
      expect(img).toMatchObject({ url: "https://x/c.png", alt: "cat", title: "A cat" });
      expect(img.position?.start.line).toBe(1);
    }
  });

  it("degrades images to links when images: 'link'", () => {
    const { text, removed } = toTelegramHTML("![cat](https://x/c.png)", { images: "link" });
    expect(text).toBe('<a href="https://x/c.png">cat</a>');
    expect(removed).toHaveLength(1);
  });

  it("reports inline vs block math", () => {
    const inline = toTelegramHTML("$a^2$").removed;
    const block = toTelegramHTML("$$\nE=mc^2\n$$").removed;
    expect(inline[0]).toMatchObject({ kind: "math", value: "a^2", inline: true });
    expect(block[0]).toMatchObject({ kind: "math", value: "E=mc^2", inline: false });
  });

  it("keeps raw math when math: 'raw'", () => {
    expect(toTelegramHTML("$a^2$", { math: "raw" }).text).toBe("<code>a^2</code>");
  });

  it("reports footnote reference and definition", () => {
    const { removed } = toTelegramHTML("a[^1]\n\n[^1]: note text");
    const notes = removed.filter((r) => r.kind === "footnote");
    expect(notes).toHaveLength(2);
    expect(notes.map((n) => n.kind === "footnote" && n.variant)).toEqual([
      "reference",
      "definition",
    ]);
    const def = notes.find((n) => n.kind === "footnote" && n.variant === "definition");
    expect(def?.kind === "footnote" && def.value).toBe("note text");
  });

  it("reports unsupported inline HTML with a tag name", () => {
    const { removed } = toTelegramHTML("x<sub>2</sub>y");
    expect(removed[0]).toMatchObject({ kind: "html", tagName: "sub", scope: "inline" });
  });

  it("collectRemoved: false yields an empty report", () => {
    const { removed } = toTelegramHTML("![a](u)\n\n$x$", { collectRemoved: false });
    expect(removed).toEqual([]);
  });
});
