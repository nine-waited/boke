import { vaultService, workspaceStore, useAppStore } from "./store.js";

function refreshTree(): void {
  useAppStore.getState().refreshTree();
}

export async function createAndOpenNote(dir = ""): Promise<string> {
  const path = await vaultService.createNote(dir);
  refreshTree();
  workspaceStore.openFile(path);
  return path;
}

export async function createAndOpenDrawing(dir = ""): Promise<string> {
  const path = await vaultService.createExcalidraw(dir);
  refreshTree();
  workspaceStore.openExcalidraw(path);
  return path;
}

export async function createFolder(dir = ""): Promise<string> {
  const path = await vaultService.createFolder(dir);
  refreshTree();
  return path;
}

export async function deleteVaultPath(path: string, kind: "file" | "directory"): Promise<void> {
  await vaultService.deletePath(path, kind);
  workspaceStore.clearPathsForDelete(path, kind === "directory");
  refreshTree();
}
