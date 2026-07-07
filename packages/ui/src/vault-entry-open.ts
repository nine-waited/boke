import { isExcalidraw, isImage, isMarkdown, isPdf } from "@chestnut/core";
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
  }
}
