import { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { Decoration, ViewPlugin, type DecorationSet } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { formatImageMarkdown, getClipboardImageFile, savePastedNoteImage } from "../note-images.js";

const wikilinkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildWikilinkDecorations(view);
    }
    update(update: import("@codemirror/view").ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildWikilinkDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

function buildWikilinkDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const wikilink = /\[\[([^\]]+)\]\]/g;
  const tag = /(?:^|\s)#([a-zA-Z\u4e00-\u9fff][\w\u4e00-\u9fff/-]*)/g;

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    let m: RegExpExecArray | null;
    wikilink.lastIndex = 0;
    while ((m = wikilink.exec(text))) {
      const start = from + m.index;
      const end = start + m[0].length;
      builder.add(start, end, Decoration.mark({ class: "cm-wikilink" }));
    }
    tag.lastIndex = 0;
    while ((m = tag.exec(text))) {
      const start = from + m.index + (m[0].startsWith(" ") ? 1 : 0);
      const end = start + m[0].trim().length;
      builder.add(start, end, Decoration.mark({ class: "cm-tag" }));
    }
  }
  return builder.finish();
}

interface MarkdownSourceEditorProps {
  content: string;
  notePath: string;
  onChange: (content: string) => void;
  onSave?: () => void;
}

export interface MarkdownSourceEditorHandle {
  goToDocLine(docLine: number): void;
}

export const MarkdownSourceEditor = forwardRef<MarkdownSourceEditorHandle, MarkdownSourceEditorProps>(
  function MarkdownSourceEditor({ content, notePath, onChange, onSave }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const notePathRef = useRef(notePath);
  onChangeRef.current = onChange;
  notePathRef.current = notePath;

  useImperativeHandle(ref, () => ({
    goToDocLine(docLine: number) {
      const view = viewRef.current;
      if (!view) return;
      const lineNo = Math.min(Math.max(docLine + 1, 1), view.state.doc.lines);
      const lineObj = view.state.doc.line(lineNo);
      view.dispatch({
        selection: { anchor: lineObj.from, head: lineObj.from },
        effects: EditorView.scrollIntoView(lineObj.from, { y: "center" }),
      });
      view.focus();
    },
  }));

  const initEditor = useCallback(() => {
    if (!containerRef.current || viewRef.current) return;

    const saveKeymap = keymap.of([
      {
        key: "Mod-s",
        run: () => {
          onSave?.();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(defaultHighlightStyle),
        wikilinkPlugin,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        saveKeymap,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          paste(event, view) {
            const file = getClipboardImageFile(event.clipboardData);
            const mdPath = notePathRef.current;
            if (!file || !mdPath) return false;
            event.preventDefault();
            void (async () => {
              const imagePath = await savePastedNoteImage(mdPath, file);
              const markdown = formatImageMarkdown(imagePath);
              const { from, to } = view.state.selection.main;
              view.dispatch({
                changes: { from, to, insert: markdown },
                selection: { anchor: from + markdown.length },
              });
            })();
            return true;
          },
        }),
        EditorView.theme({
          "&": { height: "100%" },
          ".cm-scroller": {
            overflow: "auto",
            fontFamily: "var(--boke-font)",
            fontSize: "14px",
          },
          ".cm-gutters": {
            backgroundColor: "var(--boke-bg-tertiary)",
            borderRight: "1px solid var(--boke-border)",
            fontFamily: "var(--boke-font)",
          },
        }),
      ],
    });

    viewRef.current = new EditorView({ state, parent: containerRef.current });
  }, []);

  useEffect(() => {
    initEditor();
    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [initEditor]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== content) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content]);

  return <div ref={containerRef} className="boke-source-editor" />;
  },
);
