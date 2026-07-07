import type { Ctx } from "@milkdown/ctx";
import { editorViewCtx } from "@milkdown/kit/core";
import { NodeSelection, TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { getMarkdown, replaceRange } from "@milkdown/utils";
import { findImageNodeAtDom } from "./note-image-caption.js";
import { markdownToPlainText } from "./markdown-strip-inline.js";
import { readSystemClipboardText } from "./system-clipboard.js";
export interface EditorSelectionRange {
  from: number;
  to: number;
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

export function hasClipboardText(text: string | null): text is string {
  return text !== null && text.length > 0;
}
