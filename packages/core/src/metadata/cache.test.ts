import { describe, expect, it } from "vitest";
import { parseMarkdownFile, MetadataCache } from "./cache.js";

describe("parseMarkdownFile", () => {
  it("parses wikilinks and tags", () => {
    const cache = parseMarkdownFile("notes/a.md", `---
tags: [demo]
---
# Hello

See [[notes/b]] and #inline-tag
`);
    expect(cache.links).toHaveLength(1);
    expect(cache.links[0].target).toBe("notes/b.md");
    expect(cache.tags).toContain("demo");
    expect(cache.tags).toContain("inline-tag");
  });

  it("ignores # inside fenced code and blockquotes for headings", () => {
    const cache = parseMarkdownFile(
      "notes/outline.md",
      `# Real

\`\`\`python
# not a heading
def foo():
    pass
\`\`\`

~~~bash
# shell comment
echo hi
~~~

> # quoted heading
> more quote

## Also real
`,
    );
    expect(cache.headings.map((h) => h.text)).toEqual(["Real", "Also real"]);
    expect(cache.headings.map((h) => h.level)).toEqual([1, 2]);
  });

  it("builds backlinks", () => {
    const mc = new MetadataCache();
    mc.set("a.md", "[[b]]");
    mc.set("b.md", "plain");
    const bl = mc.getBacklinks("b.md");
    expect(bl.some((x) => x.source === "a.md")).toBe(true);
  });
});
