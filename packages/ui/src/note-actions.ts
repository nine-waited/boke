import { vaultService, workspaceStore, useAppStore } from "./store.js";
import { getDefaultTitle, getT } from "./i18n/index.js";
import { confirmAction } from "./confirm-dialog.js";
import { isTauri, openVaultFolderInExplorer, TauriFsAdapter } from "@boke/storage-adapters";
import { formatNativePath } from "./vault-path-utils.js";
import { exportMarkdownToPdf } from "./markdown-pdf-export.js";

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

export async function revealInFileManager(relativePath = ""): Promise<void> {
  if (!isTauri()) return;
  const adapter = vaultService.getAdapter();
  if (!adapter || adapter.kind !== "tauri") return;
  const abs = formatNativePath((adapter as TauriFsAdapter).getAbsolutePath(relativePath));
  await openVaultFolderInExplorer(abs);
}

export async function exportNoteToPdf(relativePath: string): Promise<void> {
  if (!isTauri()) return;
  const pdfPath = await exportMarkdownToPdf(relativePath);
  useAppStore.getState().refreshTree();
  workspaceStore.openPdf(pdfPath);
  useAppStore.getState().setStatusText(getT()("status.exportPdfSuccess", { path: pdfPath }));
}
