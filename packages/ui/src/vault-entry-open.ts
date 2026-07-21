import { isExcalidraw, isImage, isMarkdown, isPdf } from "@chestnut/core";
import { focusMainContent, isFileContentTab } from "./focus-main-content.js";
import { workspaceStore } from "./store.js";

export function openVaultEntry(path: string): void {
  if (isExcalidraw(path)) {
    workspaceStore.openExcalidraw(path);
  } else if (isImage(path)) {
    workspaceStore.openImage(path);
  } else if (isPdf(path)) {
    workspaceStore.openPdf(path);
  } else if (isMarkdown(path)) {
    workspaceStore.openFile(path);
  } else {
    return;
  }
  const active = workspaceStore.getState().active;
  if (active && isFileContentTab(active.type)) focusMainContent();
}
