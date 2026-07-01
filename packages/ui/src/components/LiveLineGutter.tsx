import { useEffect, useMemo, useRef, type RefObject } from "react";

interface LiveLineGutterProps {
  content: string;
  editorWrapRef: RefObject<HTMLDivElement | null>;
  onLineClick?: (docLine: number) => void;
}

export function LiveLineGutter({ content, editorWrapRef, onLineClick }: LiveLineGutterProps) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lineCount = useMemo(() => Math.max(1, content.split(/\r?\n/).length), [content]);
  const lines = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);

  useEffect(() => {
    let scroller: HTMLElement | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;

    const sync = () => {
      if (gutterRef.current && scroller) {
        gutterRef.current.scrollTop = scroller.scrollTop;
      }
    };

    const attach = () => {
      scroller = editorWrapRef.current?.querySelector("[data-milkdown-root]") as HTMLElement | null;
      if (!scroller) return false;
      scroller.addEventListener("scroll", sync, { passive: true });
      sync();
      return true;
    };

    if (!attach()) {
      timer = setInterval(() => {
        if (attach() && timer) {
          clearInterval(timer);
          timer = null;
        }
      }, 50);
    }

    return () => {
      if (timer) clearInterval(timer);
      scroller?.removeEventListener("scroll", sync);
    };
  }, [editorWrapRef, content]);

  return (
    <div ref={gutterRef} className="boke-live-line-gutter" aria-hidden="true">
      {lines.map((lineNo) => (
        <button
          key={lineNo}
          type="button"
          className="boke-live-line-num"
          onClick={() => onLineClick?.(lineNo - 1)}
          tabIndex={-1}
        >
          {lineNo}
        </button>
      ))}
    </div>
  );
}
