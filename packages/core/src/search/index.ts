import MiniSearch from "minisearch";
import type { FileCache } from "@chestnut/plugin-sdk";
import { transformMarkdownImageRefs } from "../vault/note-images.js";

export interface SearchResult {
  path: string;
  title: string;
  score: number;
  /** One matching body line, truncated with ending ...... when long. */
  snippet: string;
  /** 0-based line index within note body (after frontmatter). Null if no exact line hit. */
  bodyLine: number | null;
  matches?: string[];
}

export interface SearchSnippetMatch {
  snippet: string;
  bodyLine: number | null;
}

const SNIPPET_MAX_CHARS = 72;
const SNIPPET_ELLIPSIS = "......";
/** Extra characters kept after the keyword when the window must shift. */
const SNIPPET_AFTER_MATCH = 3;

/** Remove markdown image refs so search only matches note body text. */
export function stripMarkdownImagesForSearch(body: string): string {
  return transformMarkdownImageRefs(body, () => "");
}

/**
 * Body text used for search matching: keep readable prose, drop image/link/wikilink paths.
 * File path / title are never indexed for search.
 */
export function toSearchableBody(body: string): string {
  let text = stripMarkdownImagesForSearch(body);
  // [label](path-or-url) → keep label only
  text = text.replace(/\[([^\]]*)\]\((?:<[^>]*>|[^)]*)\)/g, "$1");
  // [[target|alias]] → alias; [[folder/note]] → note
  text = text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_full, target, alias) => {
    if (alias) return String(alias).trim();
    const raw = String(target).trim();
    return raw.split(/[/\\]/).pop() ?? raw;
  });
  return text;
}

function queryTerms(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
}

/** True when searchable body contains at least one query term (exact substring). */
export function bodyMatchesQuery(body: string, query: string): boolean {
  const terms = queryTerms(query);
  if (terms.length === 0) return false;
  const lower = toSearchableBody(body).toLowerCase();
  return terms.some((term) => lower.includes(term));
}

/**
 * Truncate a matching line to one display row with trailing `......`.
 * If the keyword would fall outside the head window, shift the window so
 * `keyword + 3 chars after` sit just before the trailing ellipsis.
 */
export function truncateSearchSnippetLine(
  line: string,
  matchAt: number,
  matchLen: number,
  maxChars = SNIPPET_MAX_CHARS,
): string {
  if (line.length <= maxChars) return line;

  const keep = Math.max(1, maxChars - SNIPPET_ELLIPSIS.length);
  const matchStart = Math.max(0, Math.min(matchAt, line.length));
  const matchEnd = Math.max(matchStart, Math.min(line.length, matchStart + Math.max(1, matchLen)));
  const anchorEnd = Math.min(line.length, matchEnd + SNIPPET_AFTER_MATCH);

  let start = 0;
  let end = keep;

  // Keyword (and the padded tail) not fully visible in the head window → shift right.
  if (matchStart >= keep || anchorEnd > keep) {
    end = anchorEnd;
    start = Math.max(0, end - keep);
    // Prefer keeping the full keyword when the match itself is longer than the window.
    if (matchStart < start) {
      start = matchStart;
      end = Math.min(line.length, start + keep);
      if (anchorEnd - matchStart <= keep) {
        end = anchorEnd;
        start = Math.max(0, end - keep);
      }
    }
  }

  return `${line.slice(start, end)}${SNIPPET_ELLIPSIS}`;
}

/** Pick the best body line that contains a query term, truncated to one display line. */
export function buildSearchSnippet(
  body: string,
  query: string,
  maxChars = SNIPPET_MAX_CHARS,
): SearchSnippetMatch {
  const searchable = toSearchableBody(body);
  const terms = queryTerms(query);
  if (terms.length === 0) return { snippet: "", bodyLine: null };

  const lines = searchable.split(/\r?\n/);
  let bestLine = "";
  let bestScore = 0;
  let bestMatchAt = 0;
  let bestMatchLen = 0;
  let bestBodyLine: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+/g, " ").trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    let score = 0;
    let matchAt = -1;
    let matchLen = 0;
    for (const term of terms) {
      const idx = lower.indexOf(term);
      if (idx >= 0) {
        score += 1;
        if (matchAt < 0 || idx < matchAt) {
          matchAt = idx;
          matchLen = term.length;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
      bestMatchAt = Math.max(0, matchAt);
      bestMatchLen = matchLen;
      bestBodyLine = i;
    }
  }

  if (!bestLine || bestBodyLine === null) return { snippet: "", bodyLine: null };
  return {
    snippet: truncateSearchSnippetLine(bestLine, bestMatchAt, bestMatchLen, maxChars),
    bodyLine: bestBodyLine,
  };
}

export class SearchIndex {
  private bodies = new Map<string, string>();
  private mini = new MiniSearch<{ id: string; title: string; body: string }>({
    // Only body prose is searchable — never path or title.
    fields: ["body"],
    storeFields: ["title"],
    searchOptions: {
      fields: ["body"],
      fuzzy: 0.2,
      prefix: true,
    },
  });

  indexFile(cache: FileCache, body: string): void {
    const title =
      (typeof cache.frontmatter.title === "string" && cache.frontmatter.title) ||
      cache.path.split("/").pop()?.replace(/\.md$/, "") ||
      cache.path;
    const searchableBody = toSearchableBody(body);
    this.bodies.set(cache.path, body);
    if (this.mini.has(cache.path)) this.mini.discard(cache.path);
    this.mini.add({
      id: cache.path,
      title,
      body: searchableBody,
    });
  }

  removeFile(path: string): void {
    this.bodies.delete(path);
    if (this.mini.has(path)) this.mini.discard(path);
  }

  clear(): void {
    this.bodies.clear();
    this.mini.removeAll();
  }

  search(query: string, limit = 30): SearchResult[] {
    if (!query.trim()) return [];
    const results: SearchResult[] = [];
    for (const r of this.mini.search(query, { fields: ["body"] })) {
      const body = this.bodies.get(r.id) ?? "";
      // Drop fuzzy/prefix hits that are not real body-text matches (and never path/title).
      if (!bodyMatchesQuery(body, query)) continue;
      const match = buildSearchSnippet(body, query);
      if (match.bodyLine === null) continue;
      results.push({
        path: r.id,
        title: (r.title as string) ?? r.id,
        score: r.score,
        snippet: match.snippet,
        bodyLine: match.bodyLine,
        matches: r.match ? Object.keys(r.match) : undefined,
      });
      if (results.length >= limit) break;
    }
    return results;
  }
}

export const searchIndex = new SearchIndex();
