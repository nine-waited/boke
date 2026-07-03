import { vaultService, workspaceStore, useAppStore } from "./store.js";
import { getDefaultTitle } from "./i18n/index.js";

function refreshTree(): void {
  useAppStore.getState().refreshTree();
}

export async function createAndOpenNote(dir = ""): Promise<string> {
  const locale = useAppStore.getState().locale;
  const path = await vaultService.createNote(dir, getDefaultTitle(locale, "note"));
  refreshTree();
  workspaceStore.openFile(path);
  return path;
}

export async function createAndOpenDrawing(dir = ""): Promise<string> {
  const locale = useAppStore.getState().locale;
  const path = await vaultService.createExcalidraw(dir, getDefaultTitle(locale, "drawing"));
  refreshTree();
  workspaceStore.openExcalidraw(path);
  return path;
}

export async function createFolder(dir = ""): Promise<string> {
  const locale = useAppStore.getState().locale;
  const path = await vaultService.createFolder(dir, getDefaultTitle(locale, "folder"));
  refreshTree();
  return path;
}

export async function deleteVaultPath(path: string, kind: "file" | "directory"): Promise<void> {
  await vaultService.deletePath(path, kind);
  workspaceStore.clearPathsForDelete(path, kind === "directory");
  refreshTree();
}
