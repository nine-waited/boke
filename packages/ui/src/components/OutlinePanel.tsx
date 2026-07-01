import { useMemo } from "react";
import { extractHeadings, type OutlineHeading } from "../markdown-outline.js";

interface OutlinePanelProps {
  path: string;
  content: string;
  onHeadingClick?: (heading: OutlineHeading) => void;
}

export function OutlinePanel({ path, content, onHeadingClick }: OutlinePanelProps) {
  const headings = useMemo(() => extractHeadings(path, content), [path, content]);

  return (
    <aside className="boke-note-toc">
      <div className="boke-note-toc-title">目录</div>
      {headings.length === 0 ? (
        <p className="boke-note-toc-empty">暂无标题</p>
      ) : (
        <nav className="boke-note-toc-list">
          {headings.map((heading, index) => (
            <button
              key={`${heading.docLine}-${heading.text}-${index}`}
              type="button"
              className="boke-note-toc-item"
              data-level={heading.level}
              style={{ paddingLeft: `${(heading.level - 1) * 12 + 8}px` }}
              onClick={() => onHeadingClick?.(heading)}
              title={heading.text}
            >
              {heading.text}
            </button>
          ))}
        </nav>
      )}
    </aside>
  );
}
