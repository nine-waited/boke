const WIKILINK_RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
const EMBED_RE = /!\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
const TAG_RE = /(?:^|\s)#([a-zA-Z\u4e00-\u9fff][\w\u4e00-\u9fff/-]*)/g;
const HEADING_RE = /^(#{1,6})\s+(.+)$/gm;
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

import type { FileCache } from "@chestnut/plugin-sdk";
import { normalizePath } from "../vault/types.js";

function parseFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { frontmatter: {}, body: content };
  const frontmatter: Record<string, unknown> = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    let value: unknown = raw.trim();
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (/^\d+$/.test(value as string)) value = Number(value);
    else if ((value as string).startsWith("[") && (value as string).endsWith("]")) {
      value = (value as string)
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      value = (value as string).replace(/^["']|["']$/g, "");
    }
    frontmatter[key] = value;
  }
  return { frontmatter, body: content.slice(match[0].length) };
}

function resolveNoteTarget(target: string): string {
  const t = normalizePath(target);
  if (t.endsWith(".md") || t.endsWith(".excalidraw")) return t;
  return `${t}.md`;
}

export function parseMarkdownFile(path: string, content: string): FileCache {
  const { frontmatter, body } = parseFrontmatter(content);
  const links: FileCache["links"] = [];
  const embeds: FileCache["embeds"] = [];
  const tagSet = new Set<string>();

  let m: RegExpExecArray | null;
  const bodyLines = body.split("\n");

  EMBED_RE.lastIndex = 0;
  while ((m = EMBED_RE.exec(body)) !== null) {
    const line = body.slice(0, m.index).split("\n").length - 1;
    embeds.push({ target: resolveNoteTarget(m[1]), line });
  }

  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(body)) !== null) {
    if (body[m.index - 1] === "!") continue;
    const line = body.slice(0, m.index).split("\n").length - 1;
    links.push({
      target: resolveNoteTarget(m[1]),
      display: m[3],
      line,
    });
  }

  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(body)) !== null) {
    tagSet.add(m[1]);
  }

  const fmTags = frontmatter.tags;
  if (Array.isArray(fmTags)) {
    for (const t of fmTags) if (typeof t === "string") tagSet.add(t);
  } else if (typeof fmTags === "string") {
    tagSet.add(fmTags);
  }

  const headings: FileCache["headings"] = [];
  HEADING_RE.lastIndex = 0;
  while ((m = HEADING_RE.exec(body)) !== null) {
    headings.push({
      level: m[1].length,
      text: m[2].trim(),
      line: body.slice(0, m.index).split("\n").length - 1,
    });
  }

  return {
    path,
    frontmatter,
    headings,
    links,
    embeds,
    tags: [...tagSet],
  };
}

export class MetadataCache {
  private cache = new Map<string, FileCache>();
  private backlinkIndex = new Map<string, Map<string, number[]>>();

  set(path: string, content: string): FileCache {
    const normalized = normalizePath(path);
    const parsed = parseMarkdownFile(normalized, content);
    this.cache.set(normalized, parsed);
    this.rebuildBacklinks();
    return parsed;
  }

  remove(path: string): void {
    this.cache.delete(normalizePath(path));
    this.rebuildBacklinks();
  }

  get(path: string): FileCache | null {
    return this.cache.get(normalizePath(path)) ?? null;
  }

  getAll(): FileCache[] {
    return [...this.cache.values()];
  }

  getBacklinks(path: string): Array<{ source: string; lines: number[] }> {
    const key = normalizePath(path);
    const withoutExt = key.replace(/\.md$/, "");
    const result: Array<{ source: string; lines: number[] }> = [];
    for (const [target, sources] of this.backlinkIndex) {
      if (target !== key && target !== withoutExt && target !== `${withoutExt}.md`) continue;
      for (const [source, lines] of sources) {
        result.push({ source, lines: [...lines] });
      }
    }
    return result.sort((a, b) => a.source.localeCompare(b.source));
  }

  getAllTags(): Array<{ name: string; count: number }> {
    const counts = new Map<string, number>();
    for (const file of this.cache.values()) {
      for (const tag of file.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  getGraphEdges(): Array<{ source: string; target: string }> {
    const edges: Array<{ source: string; target: string }> = [];
    for (const file of this.cache.values()) {
      for (const link of file.links) {
        edges.push({ source: file.path, target: link.target });
      }
      for (const embed of file.embeds) {
        edges.push({ source: file.path, target: embed.target });
      }
    }
    return edges;
  }

  private rebuildBacklinks(): void {
    this.backlinkIndex.clear();
    for (const file of this.cache.values()) {
      for (const link of [...file.links, ...file.embeds.map((e) => ({ ...e, display: undefined }))]) {
        const target = normalizePath(link.target);
        if (!this.backlinkIndex.has(target)) this.backlinkIndex.set(target, new Map());
        const sources = this.backlinkIndex.get(target)!;
        if (!sources.has(file.path)) sources.set(file.path, []);
        sources.get(file.path)!.push(link.line);
      }
    }
  }
}

export const metadataCache = new MetadataCache();
