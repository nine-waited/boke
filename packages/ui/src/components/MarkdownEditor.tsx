import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import type { EditorView } from "@milkdown/kit/prose/view";
import { TextSelection } from "@milkdown/kit/prose/state";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { replaceAll } from "@milkdown/utils";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type MutableRefObject } from "react";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

export interface MarkdownEditorHandle {
  goToDocLine(docLine: number, content: string): void;
}

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  presentation?: "default" | "live";
}

interface MilkdownCrepeEditorProps extends MarkdownEditorProps {
  crepeRef: MutableRefObject<Crepe | null>;
}

function findHeadingPos(view: EditorView, markdown: string, docLine: number): number | null {
  const lines = markdown.split(/\r?\n/);
  const match = (lines[docLine] ?? "").trim().match(/^#{1,6}\s+(.+?)\s*$/);
  if (!match) return null;

  const title = match[1].trim();
  let occurrence = 0;
  for (let i = 0; i < docLine; i++) {
    const prev = (lines[i] ?? "").trim().match(/^#{1,6}\s+(.+?)\s*$/);
    if (prev && prev[1].trim() === title) occurrence++;
  }

  const headings = view.dom.querySelectorAll("h1, h2, h3, h4, h5, h6");
  let seen = 0;
  for (const el of headings) {
    if (el.textContent?.trim() !== title) continue;
    if (seen === occurrence) {
      try {
        return view.posAtDOM(el, 0);
      } catch {
        return null;
      }
    }
    seen++;
  }
  return null;
}

function MilkdownCrepeEditor({
  content,
  onChange,
  onSave,
  presentation = "default",
  crepeRef,
}: MilkdownCrepeEditorProps) {
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const lastEmitted = useRef(content);
  const skipExternalSync = useRef(false);

  onChangeRef.current = onChange;
  onSaveRef.current = onSave;

  const { loading } = useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue: content,
      features: {
        [CrepeFeature.TopBar]: presentation !== "live",
      },
      featureConfigs: {
        [CrepeFeature.Placeholder]: {
          text: presentation === "live" ? "输入内容，实时渲染…" : "开始书写 Markdown…",
          mode: "block",
        },
      },
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => {
        if (markdown === lastEmitted.current) return;
        lastEmitted.current = markdown;
        skipExternalSync.current = true;
        onChangeRef.current(markdown);
      });
    });

    crepeRef.current = crepe;
    return crepe;
  }, []);

  useEffect(() => {
    if (loading) return;
    const crepe = crepeRef.current;
    if (!crepe) return;

    if (skipExternalSync.current) {
      skipExternalSync.current = false;
      return;
    }

    if (content === lastEmitted.current) return;

    lastEmitted.current = content;
    try {
      crepe.editor.action(replaceAll(content, true));
    } catch {
      // Editor may still be initializing.
    }
  }, [content, loading, crepeRef]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "s") {
        event.preventDefault();
        onSaveRef.current?.();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return <Milkdown />;
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor({ presentation = "default", content, ...props }, ref) {
    const wrapRef = useRef<HTMLDivElement>(null);
    const crepeRef = useRef<Crepe | null>(null);

    const goToDocLine = useCallback((docLine: number, markdown: string) => {
      const crepe = crepeRef.current;
      const scrollEl = wrapRef.current?.querySelector(".boke-live-scroll");
      if (!crepe) return;

      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const pos = findHeadingPos(view, markdown, docLine);
        if (pos === null) return;

        const safePos = Math.min(Math.max(pos, 0), view.state.doc.content.size);
        view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, safePos)));
        view.focus();

        try {
          const coords = view.coordsAtPos(safePos);
          if (scrollEl) {
            const scrollRect = scrollEl.getBoundingClientRect();
            scrollEl.scrollTop += coords.top - scrollRect.top - scrollRect.height / 3;
          }
        } catch {
          // ignore scroll errors
        }
      });
    }, []);

    useImperativeHandle(ref, () => ({ goToDocLine }), [goToDocLine]);

    const isLive = presentation === "live";

    return (
      <div ref={wrapRef} className={isLive ? "boke-milkdown-wrap boke-live-pane" : "boke-milkdown-wrap"}>
        {isLive ? (
          <div className="boke-live-scroll">
            <div className="boke-live-editor-inner">
              <MilkdownProvider>
                <MilkdownCrepeEditor
                  crepeRef={crepeRef}
                  presentation={presentation}
                  content={content}
                  {...props}
                />
              </MilkdownProvider>
            </div>
          </div>
        ) : (
          <MilkdownProvider>
            <MilkdownCrepeEditor crepeRef={crepeRef} presentation={presentation} content={content} {...props} />
          </MilkdownProvider>
        )}
      </div>
    );
  },
);
