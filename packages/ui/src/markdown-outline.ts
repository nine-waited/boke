import { parseMarkdownFile } from "@chestnut/core";

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export interface OutlineHeading {
  level: number;
  text: string;
  line: number;
  docLine: number;
}

export function extractHeadings(path: string, content: string): OutlineHeading[] {
  const fm = content.match(FRONTMATTER_RE);
  const offset = fm ? fm[0].split(/\r?\n/).length : 0;
  return parseMarkdownFile(path, content).headings.map((h) => ({
    ...h,
    docLine: offset + h.line,
  }));
}

/** 0-based document line index → character offset in full markdown source. */
export function docLineToCharOffset(content: string, docLine: number): number {
  const lines = content.split(/\r?\n/);
  const clamped = Math.max(0, Math.min(docLine, lines.length - 1));
  let offset = 0;
  for (let i = 0; i < clamped; i++) {
    offset += lines[i].length + 1;
  }
  return offset;
}

export function headingTextAtDocLine(content: string, docLine: number): string {
  const line = content.split(/\r?\n/)[docLine] ?? "";
  const match = line.match(/^#{1,6}\s+(.+?)\s*$/);
  return match?.[1]?.trim() ?? line.trim();
}
