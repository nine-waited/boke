import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import type { Ctx } from "@milkdown/ctx";
import type { EditorView } from "@milkdown/kit/prose/view";
import { TextSelection } from "@milkdown/kit/prose/state";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { replaceAll, getMarkdown } from "@milkdown/utils";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type MutableRefObject } from "react";
import { resolveImageSrcForDisplay, savePastedNoteImage } from "../note-images.js";
import { attachNoteImageSelectHandlers } from "../note-image-select.js";
import { deleteNoteImageFileOnRemove, getImageVaultPathFromView } from "../note-image-delete.js";
import { getT } from "../i18n/index.js";
import {
  attachMarkdownEditorContextMenu,
  type EditorContextMenuPoint,
} from "../markdown-editor-context-menu.js";
import type { EditorSelectionRange } from "../markdown-editor-clipboard.js";
import { readClipboardForPaste } from "../markdown-editor-clipboard.js";
import { attachLiveEditorScrollLock } from "../markdown-editor-live-view.js";
import { MarkdownEditorContextMenu } from "./MarkdownEditorContextMenu.js";
import "../crepe-theme.css";

export interface MarkdownEditorHandle {
  goToDocLine(docLine: number, content: string): void;
}

interface MarkdownEditorProps {
  content: string;
  notePath: string;
  onChange: (content: string) => void;
  onSave?: () => void;
  presentation?: "default" | "live";
}

interface MilkdownCrepeEditorProps extends MarkdownEditorProps {
  crepeRef: MutableRefObject<Crepe | null>;
  onOpenContextMenu: (state: EditorContextMenuState) => void;
}

interface EditorContextMenuState extends EditorContextMenuPoint {
  selection: EditorSelectionRange;
  clipboardText: string | null;
}

function deleteImageAtDom(view: EditorView, img: HTMLImageElement): boolean {
  let deleted = false;
  view.state.doc.descendants((node, pos) => {
    if (deleted) return false;
    const name = node.type.name.toLowerCase();
    if (!name.includes("image")) return;
    const domNode = view.nodeDOM(pos);
    if (domNode === img || (domNode instanceof HTMLElement && domNode.contains(img))) {
      view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize));
      deleted = true;
      return false;
    }
    return undefined;
  });
  return deleted;
}

function findImageNodeAtDom(
  view: EditorView,
  img: HTMLImageElement,
): { pos: number; nodeSize: number } | null {
  let found: { pos: number; nodeSize: number } | null = null;
  view.state.doc.descendants((node, pos) => {
    if (found) return false;
    const name = node.type.name.toLowerCase();
    if (!name.includes("image")) return;
    const domNode = view.nodeDOM(pos);
    if (domNode === img || (domNode instanceof HTMLElement && domNode.contains(img))) {
      found = { pos, nodeSize: node.nodeSize };
      return false;
    }
    return undefined;
  });
  return found;
}

function insertLineBelowImageAtDom(view: EditorView, img: HTMLImageElement): boolean {
  const imageNode = findImageNodeAtDom(view, img);
  if (!imageNode) return false;

  const { state } = view;
  const insertPos = imageNode.pos + imageNode.nodeSize;
  const paragraphType = state.schema.nodes.paragraph;
  if (!paragraphType) return false;

  const nodeAfter = insertPos < state.doc.content.size ? state.doc.nodeAt(insertPos) : null;
  if (nodeAfter?.type === paragraphType && nodeAfter.content.size === 0) {
    const cursorPos = insertPos + 1;
    view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, cursorPos)));
    view.focus();
    return true;
  }

  const paragraph = paragraphType.create();
  const tr = state.tr.insert(insertPos, paragraph);
  tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
  view.dispatch(tr);
  view.focus();
  return true;
}

function updateImageCaptionAtDom(view: EditorView, img: HTMLImageElement, caption: string): boolean {
  const imageNode = findImageNodeAtDom(view, img);
  if (!imageNode) return false;

  const node = view.state.doc.nodeAt(imageNode.pos);
  if (!node) return false;

  const attr = node.type.name === "image-block" ? "caption" : "alt";
  view.dispatch(view.state.tr.setNodeAttribute(imageNode.pos, attr, caption));
  return true;
}

function refreshEditorMarkdown(ctx: Ctx) {
  const markdown = getMarkdown()(ctx);
  replaceAll(markdown, true)(ctx);
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
  notePath,
  onChange,
  onSave,
  presentation = "default",
  crepeRef,
  onOpenContextMenu,
}: MilkdownCrepeEditorProps) {
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const notePathRef = useRef(notePath);
  const lastEmitted = useRef(content);
  const skipExternalSync = useRef(false);
  const editorRootRef = useRef<HTMLElement | null>(null);
  const onOpenContextMenuRef = useRef(onOpenContextMenu);

  onChangeRef.current = onChange;
  onSaveRef.current = onSave;
  notePathRef.current = notePath;
  onOpenContextMenuRef.current = onOpenContextMenu;

  const { loading } = useEditor((root) => {
    editorRootRef.current = root;
    const uploadImage = async (file: File) => savePastedNoteImage(notePathRef.current, file);

    const t = getT();
    const crepe = new Crepe({
      root,
      defaultValue: content,
      features: {
        [CrepeFeature.TopBar]: presentation !== "live",
        [CrepeFeature.BlockEdit]: false,
      },
      featureConfigs: {
        [CrepeFeature.Placeholder]: {
          text:
            presentation === "live" ? t("note.editorLivePlaceholder") : t("note.editorSourcePlaceholder"),
          mode: "block",
        },
        [CrepeFeature.ImageBlock]: {
          onUpload: uploadImage,
          inlineOnUpload: uploadImage,
          blockOnUpload: uploadImage,
          proxyDomURL: (url) => resolveImageSrcForDisplay(url, notePathRef.current),
          blockCaptionIcon: "",
          blockCaptionPlaceholderText: t("note.imageCaptionPlaceholder"),
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
    if (loading || presentation !== "live") return;
    const crepe = crepeRef.current;
    if (!crepe) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    let boundEditor: HTMLElement | null = null;

    const bindIfNeeded = () => {
      const root = editorRootRef.current;
      const editorEl =
        root?.querySelector<HTMLElement>(".ProseMirror") ??
        root?.closest<HTMLElement>(".ProseMirror") ??
        root;
      if (!(editorEl instanceof HTMLElement) || editorEl === boundEditor) return;

      cleanup?.();
      boundEditor = editorEl;
      const cleanups = [
        attachNoteImageSelectHandlers(editorEl, {
          onDelete: async (img) => {
            await crepe.editor.action((ctx) => {
              const view = ctx.get(editorViewCtx);
              const vaultPath = getImageVaultPathFromView(view, img, notePathRef.current);
              deleteImageAtDom(view, img);
              if (!vaultPath) return;
              const md = getMarkdown()(ctx);
              void deleteNoteImageFileOnRemove(vaultPath, notePathRef.current, md);
            });
          },
          onInsertLineBelow: (img) => {
            crepe.editor.action((ctx) => {
              const view = ctx.get(editorViewCtx);
              insertLineBelowImageAtDom(view, img);
            });
          },
          onUpdateCaption: async (img, caption) => {
            await crepe.editor.action((ctx) => {
              const view = ctx.get(editorViewCtx);
              if (!updateImageCaptionAtDom(view, img, caption)) return;
              refreshEditorMarkdown(ctx);
            });
          },
        }),
        attachLiveEditorScrollLock(editorEl),
      ];
      cleanup = () => cleanups.forEach((fn) => fn());
    };

    const tryAttach = () => {
      if (cancelled) return;
      if (!editorRootRef.current?.querySelector(".ProseMirror")) {
        requestAnimationFrame(tryAttach);
        return;
      }
      bindIfNeeded();
    };

    tryAttach();

    const root = editorRootRef.current;
    const observer =
      root &&
      new MutationObserver(() => {
        if (cancelled) return;
        bindIfNeeded();
      });
    if (observer && root) {
      observer.observe(root, { childList: true, subtree: true });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      cleanup?.();
      boundEditor = null;
    };
  }, [loading, presentation, crepeRef]);

  useEffect(() => {
    if (loading) return;
    const crepe = crepeRef.current;
    if (!crepe) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const tryAttach = () => {
      if (cancelled) return;
      try {
        crepe.editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          if (!view?.dom) {
            requestAnimationFrame(tryAttach);
            return;
          }
          if (cleanup) return;
          cleanup = attachMarkdownEditorContextMenu(view.dom, (point) => {
            if (!view.editable) return;
            view.focus();
            const { from, to } = view.state.selection;
            const selection = { from, to };
            void readClipboardForPaste().then((clipboardText) => {
              onOpenContextMenuRef.current({ ...point, selection, clipboardText });
            });
          });
        });
      } catch {
        requestAnimationFrame(tryAttach);
      }
    };

    tryAttach();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [loading, crepeRef]);

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
    const [contextMenu, setContextMenu] = useState<EditorContextMenuState | null>(null);

    const openContextMenu = useCallback((state: EditorContextMenuState) => {
      setContextMenu(state);
    }, []);

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
                  onOpenContextMenu={openContextMenu}
                  {...props}
                />
              </MilkdownProvider>
            </div>
          </div>
        ) : (
          <MilkdownProvider>
            <MilkdownCrepeEditor
              crepeRef={crepeRef}
              presentation={presentation}
              content={content}
              onOpenContextMenu={openContextMenu}
              {...props}
            />
          </MilkdownProvider>
        )}
        {contextMenu && (
          <MarkdownEditorContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            selection={contextMenu.selection}
            clipboardText={contextMenu.clipboardText}
            crepe={crepeRef.current}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>
    );
  },
);
