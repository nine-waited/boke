import type { Ctx } from "@milkdown/ctx";
import { isSingleMarkdownImageLine } from "@chestnut/core";
import { editorViewCtx } from "@milkdown/kit/core";
import { NodeSelection, TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { getMarkdown, replaceRange } from "@milkdown/utils";
import { findImageNodeAtDom } from "./note-image-caption.js";
import { getImageVaultPathFromView } from "./note-image-delete.js";
import { markdownToPlainText } from "./markdown-strip-inline.js";
import { vaultService } from "./store.js";
import {
  readSystemClipboardText,
  writeSystemClipboardImage,
  writeSystemClipboardImageElement,
} from "./system-clipboard.js";

export interface EditorSelectionRange {
  from: number;
  to: number;
}

function mimeFromImagePath(path: string): string {
  switch (path.split(".").pop()?.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "bmp":
      return "image/bmp";
    case "ico":
      return "image/x-icon";
    default:
      return "image/png";
  }
}

export function hasEditorTextSelection(range: EditorSelectionRange): boolean {
  return range.from !== range.to;
}

export function restoreEditorSelection(ctx: Ctx, range: EditorSelectionRange): void {
  const view = ctx.get(editorViewCtx);
  const max = view.state.doc.content.size;
  const from = Math.min(Math.max(range.from, 0), max);
  const to = Math.min(Math.max(range.to, 0), max);
  view.dispatch(
    view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)),
  );
}

/** Read clipboard for paste. Uses native API in Tauri to avoid permission prompts. */
export async function readClipboardForPaste(): Promise<string | null> {
  return readSystemClipboardText();
}

export function pasteMarkdownIntoEditor(
  ctx: Ctx,
  range: EditorSelectionRange,
  markdown: string,
): void {
  const view = ctx.get(editorViewCtx);
  const max = view.state.doc.content.size;
  const from = Math.min(Math.max(range.from, 0), max);
  const to = Math.min(Math.max(range.to, 0), max);
  replaceRange(markdown, { from, to })(ctx);
  view.focus();
}

/** Serialize the saved selection as markdown (same as Ctrl+C / clipboardTextSerializer). */
export function getEditorSelectionMarkdown(ctx: Ctx, range: EditorSelectionRange): string | null {
  if (!hasEditorTextSelection(range)) return null;
  restoreEditorSelection(ctx, range);
  const view = ctx.get(editorViewCtx);
  const { from, to } = view.state.selection;
  const markdown = getMarkdown({ from, to })(ctx);
  return markdown || null;
}

/** Plain text for the selection: no bold, headings, list markers, etc. */
export function getEditorSelectionPlainText(ctx: Ctx, range: EditorSelectionRange): string | null {
  if (!hasEditorTextSelection(range)) return null;
  restoreEditorSelection(ctx, range);
  const view = ctx.get(editorViewCtx);
  const { from, to } = view.state.selection;
  const text = view.state.doc.textBetween(from, to, "\n\n", "\n").trimEnd();
  if (text) return text;
  const markdown = getMarkdown({ from, to })(ctx);
  return markdown ? markdownToPlainText(markdown) : null;
}

export function getSourceSelectionPlainText(from: number, to: number, doc: string): string | null {
  if (from === to) return null;
  return markdownToPlainText(doc.slice(from, to));
}

export function selectImageNodeAtDom(view: EditorView, img: HTMLImageElement): boolean {
  const found = findImageNodeAtDom(view, img);
  if (!found) return false;
  view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, found.pos)));
  view.focus();
  return true;
}

/** Markdown for a single image node (block or inline). */
export function getImageMarkdownFromDom(ctx: Ctx, img: HTMLImageElement): string | null {
  const view = ctx.get(editorViewCtx);
  const found = findImageNodeAtDom(view, img);
  if (!found) return null;
  const markdown = getMarkdown({ from: found.pos, to: found.pos + found.nodeSize })(ctx);
  return markdown?.trim() ? markdown.trim() : null;
}

/** Copy image pixels to the clipboard (vault bytes first, then DOM rasterization). */
export async function copyImageBinaryFromDom(
  view: EditorView,
  img: HTMLImageElement,
  notePath: string,
): Promise<boolean> {
  const vaultPath = getImageVaultPathFromView(view, img, notePath);
  if (vaultPath) {
    try {
      const bytes = await vaultService.readBinary(vaultPath);
      if (await writeSystemClipboardImage(bytes, mimeFromImagePath(vaultPath))) {
        return true;
      }
    } catch {
      // Fall through to DOM rasterization.
    }
  }
  return writeSystemClipboardImageElement(img);
}

export function hasClipboardText(text: string | null): text is string {
  return text !== null && text.length > 0;
}

/** Paste handler: live editor otherwise inserts markdown image syntax as plain text. */
export function attachLiveEditorMarkdownPaste(
  editorEl: HTMLElement,
  onPasteMarkdown: (markdown: string) => void,
): () => void {
  const onPaste = (event: ClipboardEvent) => {
    const text = event.clipboardData?.getData("text/plain");
    if (!text || !isSingleMarkdownImageLine(text)) return;

    event.preventDefault();
    event.stopPropagation();
    onPasteMarkdown(text.trim());
  };

  editorEl.addEventListener("paste", onPaste, true);
  return () => editorEl.removeEventListener("paste", onPaste, true);
}
