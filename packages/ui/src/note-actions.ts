import { exportTargetDirPath } from "@chestnut/core";
import { vaultService, workspaceStore, useAppStore } from "./store.js";
import { getDefaultTitle, getT } from "./i18n/index.js";
import { confirmAction } from "./confirm-dialog.js";
import { resolveNewItemParentDir, fileTreeSelection } from "./file-tree-selection.js";
import { fileTreeRename } from "./file-tree-rename.js";
import { isTauri, revealVaultEntry, TauriFsAdapter } from "@chestnut/storage-adapters";
import { exportMarkdownToPdf } from "./markdown-pdf-export.js";
import { exportMarkdownBundle } from "./markdown-md-export.js";
import { revealFileInTree, revealFileInTreeWhenReady } from "./file-tree-expand-context.js";

function refreshTree(): void {
  useAppStore.getState().refreshTree();
}

function resolveCreateDir(dir?: string): string {
  return dir !== undefined ? dir : resolveNewItemParentDir();
}

function finishCreate(
  path: string,
  opts: { kind: "file" | "folder"; open?: () => void },
): void {
  refreshTree();
  if (opts.kind === "file") {
    fileTreeSelection.setSelectedFilePath(path);
  } else {
    fileTreeSelection.setSelectedFolderPath(path);
  }
  revealFileInTree(path);
  fileTreeRename.requestRename(path);
  opts.open?.();
  void revealFileInTreeWhenReady(path);
}

export async function createAndOpenNote(dir?: string): Promise<string> {
  const locale = useAppStore.getState().locale;
  const path = await vaultService.createNote(resolveCreateDir(dir), getDefaultTitle(locale, "note"));
  finishCreate(path, { kind: "file", open: () => workspaceStore.openFile(path) });
  return path;
}

export async function createAndOpenDrawing(dir?: string): Promise<string> {
  const locale = useAppStore.getState().locale;
  const path = await vaultService.createExcalidraw(resolveCreateDir(dir), getDefaultTitle(locale, "drawing"));
  finishCreate(path, { kind: "file", open: () => workspaceStore.openExcalidraw(path) });
  return path;
}

export async function createFolder(dir?: string): Promise<string> {
  const locale = useAppStore.getState().locale;
  const path = await vaultService.createFolder(resolveCreateDir(dir), getDefaultTitle(locale, "folder"));
  finishCreate(path, { kind: "folder" });
  return path;
}

export async function deleteVaultPath(path: string, kind: "file" | "directory"): Promise<void> {
  const picDir = kind === "file" ? await vaultService.notePicDirIfExists(path) : null;
  await vaultService.deletePath(path, kind);
  workspaceStore.clearPathsForDelete(path, kind === "directory");
  if (picDir) {
    workspaceStore.clearPathsForDelete(picDir, true);
  }
  refreshTree();
}

export async function confirmAndDeleteVaultPath(
  path: string,
  kind: "file" | "directory",
  label: string,
): Promise<boolean> {
  const t = getT();
  const picDir = kind === "file" ? await vaultService.notePicDirIfExists(path) : null;
  const picFolder = picDir?.split("/").pop() ?? "";
  const confirmed = await confirmAction({
    title: kind === "directory" ? t("fileTree.deleteFolder") : t("fileTree.delete"),
    message: picDir
      ? t("fileTree.deleteNoteConfirm", { name: label, picFolder })
      : t("fileTree.deleteConfirm", { name: label }),
    confirmLabel: t("common.delete"),
    cancelLabel: t("common.cancel"),
    danger: true,
  });
  if (!confirmed) return false;
  await deleteVaultPath(path, kind);
  return true;
}

export async function revealInFileManager(relativePath?: string): Promise<void> {
  if (!isTauri()) return;
  const adapter = vaultService.getAdapter();
  if (!adapter || adapter.kind !== "tauri") return;
  try {
    await revealVaultEntry(
      (adapter as TauriFsAdapter).getRootPath(),
      relativePath ?? null,
    );
  } catch (err) {
    console.error("[Chestnut] reveal in file manager failed:", err);
    useAppStore.getState().setStatusText(getT()("status.revealInFileManagerFailed"));
  }
}

async function waitForVaultTreeEntry(relativePath: string): Promise<void> {
  const parentDir = relativePath.includes("/")
    ? relativePath.slice(0, relativePath.lastIndexOf("/"))
    : "";

  for (let attempt = 0; attempt < 30; attempt++) {
    const list = await vaultService.listTree(parentDir);
    if (list.some((entry) => entry.path === relativePath)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function revealExportedPdfInFileManager(pdfPath: string): Promise<void> {
  try {
    await revealInFileManager(pdfPath);
  } catch (err) {
    console.error("[Chestnut] reveal exported pdf failed, opening target folder:", err);
    await revealInFileManager(exportTargetDirPath());
  }
}

export async function exportNoteToPdf(relativePath: string): Promise<void> {
  if (!isTauri()) return;
  const pdfPath = await exportMarkdownToPdf(relativePath);
  workspaceStore.openPdf(pdfPath);
  useAppStore.getState().refreshTree();
  await waitForVaultTreeEntry(pdfPath);
  await revealFileInTreeWhenReady(pdfPath);
  try {
    await revealExportedPdfInFileManager(pdfPath);
  } catch (err) {
    console.error("[Chestnut] reveal exported pdf in file manager failed:", err);
  }
  useAppStore.getState().setStatusText(getT()("status.exportPdfSuccess", { path: pdfPath }));
}

export async function exportNoteToMarkdown(relativePath: string): Promise<void> {
  if (!isTauri()) return;
  const mdPath = await exportMarkdownBundle(relativePath);
  useAppStore.getState().refreshTree();
  await waitForVaultTreeEntry(mdPath);
  fileTreeSelection.setSelectedFilePath(mdPath);
  await revealFileInTreeWhenReady(mdPath);
  try {
    await revealInFileManager(mdPath);
  } catch (err) {
    console.error("[Chestnut] reveal exported markdown in file manager failed:", err);
  }
  useAppStore.getState().setStatusText(getT()("status.exportMarkdownSuccess", { path: mdPath }));
}
