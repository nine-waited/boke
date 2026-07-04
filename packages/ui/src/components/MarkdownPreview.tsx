import { useEffect, useRef } from "react";
import { renderMarkdown, attachPreviewHandlers, hydrateEmbedImages } from "../markdown.js";

interface MarkdownPreviewProps {
  content: string;
  path: string;
}

export function MarkdownPreview({ content, path }: MarkdownPreviewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = renderMarkdown(content);
    attachPreviewHandlers(ref.current, path);
    hydrateEmbedImages(ref.current, path);
  }, [content, path]);

  return <div ref={ref} className="boke-markdown-preview" />;
}
