import MiniSearch from "minisearch";
import type { FileCache } from "@boke/plugin-sdk";

export interface SearchResult {
  path: string;
  title: string;
  score: number;
  matches?: string[];
}

export class SearchIndex {
  private mini = new MiniSearch<{ id: string; title: string; body: string; tags: string }>({
    fields: ["title", "body", "tags"],
    storeFields: ["title"],
    searchOptions: {
      boost: { title: 3, tags: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  indexFile(cache: FileCache, body: string): void {
    const title =
      (typeof cache.frontmatter.title === "string" && cache.frontmatter.title) ||
      cache.path.split("/").pop()?.replace(/\.md$/, "") ||
      cache.path;
    this.mini.add({
      id: cache.path,
      title,
      body,
      tags: cache.tags.join(" "),
    });
  }

  removeFile(path: string): void {
    if (this.mini.has(path)) this.mini.discard(path);
  }

  clear(): void {
    this.mini.removeAll();
  }

  search(query: string, limit = 30): SearchResult[] {
    if (!query.trim()) return [];
    return this.mini.search(query).slice(0, limit).map((r) => ({
      path: r.id,
      title: (r.title as string) ?? r.id,
      score: r.score,
      matches: r.match ? Object.keys(r.match) : undefined,
    }));
  }
}

export const searchIndex = new SearchIndex();
