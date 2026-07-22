import { describe, expect, it } from "vitest";
import { buildSearchSnippet, SearchIndex, stripMarkdownImagesForSearch } from "./index.js";
import type { FileCache } from "@chestnut/plugin-sdk";

describe("stripMarkdownImagesForSearch", () => {
  it("removes markdown image refs", () => {
    expect(stripMarkdownImagesForSearch("hello ![alt](foo_pic/a.png) world")).toBe("hello  world");
  });
});

describe("buildSearchSnippet", () => {
  it("returns the line that contains the query", () => {
    const body = "# Title\n\nhello world\nfoo bar keyword here\n";
    expect(buildSearchSnippet(body, "keyword")).toEqual({
      snippet: "foo bar keyword here",
      bodyLine: 3,
    });
  });

  it("truncates long lines with ending ellipsis", () => {
    const long = `keyword ${"x".repeat(100)}`;
    const { snippet } = buildSearchSnippet(long, "keyword", 40);
    expect(snippet.startsWith("keyword")).toBe(true);
    expect(snippet.endsWith("......")).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(40);
    expect(snippet.toLowerCase()).toContain("keyword");
  });

  it("shifts so keyword + 3 chars sit before the trailing ellipsis", () => {
    const long = `${"x".repeat(100)} keywordABCDE ${"y".repeat(20)}`;
    const { snippet } = buildSearchSnippet(long, "keyword", 40);
    expect(snippet.endsWith("......")).toBe(true);
    expect(snippet.length).toBeLessThanOrEqual(40);
    // keyword + next 3 chars ("ABC") immediately before ......
    expect(snippet.slice(0, -"......".length).endsWith("keywordABC")).toBe(true);
  });

  it("does not use image lines for snippets", () => {
    const body = "intro\n![keyword](foo_pic/keyword.png)\nplain keyword text\n";
    expect(buildSearchSnippet(body, "keyword")).toEqual({
      snippet: "plain keyword text",
      bodyLine: 2,
    });
  });
});

describe("SearchIndex body-only matching", () => {
  function cache(path: string): FileCache {
    return {
      path,
      tags: [],
      links: [],
      embeds: [],
      headings: [],
      frontmatter: {},
      mtime: 0,
      size: 0,
    } as FileCache;
  }

  it("matches body text but not image markdown", () => {
    const index = new SearchIndex();
    index.indexFile(cache("a.md"), "hello world");
    index.indexFile(cache("b.md"), "see ![photo](notes/b_pic/photo.png)");
    expect(index.search("hello").map((r) => r.path)).toEqual(["a.md"]);
    expect(index.search("photo").map((r) => r.path)).toEqual([]);
  });

  it("returns bodyLine for matched results", () => {
    const index = new SearchIndex();
    index.indexFile(cache("a.md"), "alpha\nbeta keyword gamma\n");
    expect(index.search("keyword")[0]?.bodyLine).toBe(1);
  });

  it("does not match file path or filename-only hits", () => {
    const index = new SearchIndex();
    index.indexFile(cache("notes/keyword-note.md"), "unrelated body text");
    expect(index.search("keyword").map((r) => r.path)).toEqual([]);
    expect(index.search("notes").map((r) => r.path)).toEqual([]);
  });

  it("does not match markdown link or image paths", () => {
    const index = new SearchIndex();
    index.indexFile(cache("a.md"), "see [label](folder/keyword.png) and ![x](pic/keyword.jpg)");
    expect(index.search("keyword").map((r) => r.path)).toEqual([]);
    index.indexFile(cache("b.md"), "body has keyword here");
    expect(index.search("keyword").map((r) => r.path)).toEqual(["b.md"]);
  });

  it("does not match title-only hits", () => {
    const index = new SearchIndex();
    index.indexFile(
      { ...cache("title-hit.md"), frontmatter: { title: "Keyword Note" } },
      "unrelated body",
    );
    expect(index.search("Keyword").map((r) => r.path)).toEqual([]);
  });
});
