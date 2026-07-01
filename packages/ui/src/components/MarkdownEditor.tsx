import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import { TextSelection } from "@milkdown/kit/prose/state";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { replaceAll } from "@milkdown/utils";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type MutableRefObject } from "react";
import { LiveLineGutter } from "./LiveLineGutter.js";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

export interface MarkdownEditorHandle {
  goToDocLine(docLine: number, content: string): void;
}

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  /** `live` hides chrome for a document-like single-pane experience. */
  presentation?: "default" | "live";
}

interface MilkdownCrepeEditorProps extends MarkdownEditorProps {
  crepeRef: MutableRefObject<Crepe | null>;
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
      if (!crepe) return;

      const lines = markdown.split(/\r?\n/);
      const lineText = lines[docLine] ?? "";
      const root = wrapRef.current?.querySelector("[data-milkdown-root]");
      if (!root) return;

      crepe.editor.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const headingMatch = lineText.match(/^#{1,6}\s+(.+?)\s*$/);
        if (headingMatch) {
          const title = headingMatch[1].trim();
          for (const el of root.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
            if (el.textContent?.trim() !== title) continue;
            try {
              const pos = view.posAtDOM(el, 0);
              const safePos = Math.min(pos + 1, view.state.doc.content.size);
              view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, safePos)));
              view.focus();
            } catch {
              // posAtDOM may fail while the document is updating.
            }
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
          }
        }

        const search = lineText.trim();
        if (!search) return;

        let found: number | null = null;
        view.state.doc.descendants((node, pos) => {
          if (found !== null) return false;
          if (node.isText && node.text?.includes(search)) {
            found = pos;
            return false;
          }
          return true;
        });

        if (found !== null) {
          const safePos = Math.min(found + 1, view.state.doc.content.size);
          view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, safePos)));
          view.focus();
          try {
            const dom = view.domAtPos(safePos).node as HTMLElement;
            (dom.nodeType === Node.ELEMENT_NODE ? dom : dom.parentElement)?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          } catch {
            // ignore scroll errors
          }
        }
      });
    }, []);

    useImperativeHandle(ref, () => ({ goToDocLine }), [goToDocLine]);

    const isLive = presentation === "live";

    return (
      <div
        ref={wrapRef}
        className={isLive ? "boke-milkdown-wrap boke-live-pane" : "boke-milkdown-wrap"}
      >
        {isLive ? (
          <div className="boke-live-editor-shell">
            <LiveLineGutter
              content={content}
              editorWrapRef={wrapRef}
              onLineClick={(docLine) => goToDocLine(docLine, content)}
            />
            <div className="boke-live-editor-body">
              <MilkdownProvider>
                <MilkdownCrepeEditor crepeRef={crepeRef} presentation={presentation} content={content} {...props} />
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
