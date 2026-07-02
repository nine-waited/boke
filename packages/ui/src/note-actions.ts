import { vaultService, workspaceStore, useAppStore } from "./store.js";

export async function createAndOpenNote(): Promise<string> {
  const path = await vaultService.createNote();
  useAppStore.getState().refreshTree();
  workspaceStore.openFile(path);
  return path;
}

export async function createAndOpenDrawing(): Promise<string> {
  const path = await vaultService.createExcalidraw();
  useAppStore.getState().refreshTree();
  workspaceStore.openExcalidraw(path);
  return path;
}
