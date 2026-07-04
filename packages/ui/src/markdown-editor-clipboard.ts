import type { Ctx } from "@milkdown/ctx";
import { editorViewCtx } from "@milkdown/kit/core";
import { TextSelection } from "@milkdown/kit/prose/state";
import { getMarkdown, replaceRange } from "@milkdown/utils";import { readSystemClipboardText } from "./system-clipboard.js";

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

export function hasClipboardText(text: string | null): text is string {
  return text !== null && text.length > 0;
}
