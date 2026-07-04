import {
  isInNotePicFolder,
  markdownReferencesImage,
  normalizePath,
  notePicDirPath,
} from "@chestnut/core";
import type { EditorView } from "@milkdown/kit/prose/view";
import { resolveImageVaultPath } from "./image-open.js";
import { useAppStore, vaultService } from "./store.js";

function getVaultRoot(): string | null {
  const adapter = vaultService.getAdapter();
  if (!adapter || adapter.kind !== "tauri" || !("getRootPath" in adapter)) return null;
  return (adapter as { getRootPath(): string }).getRootPath().replace(/\\/g, "/").replace(/\/$/, "");
}

export function getImageVaultPathFromView(
  view: EditorView,
  img: HTMLImageElement,
  notePath: string,
): string | null {
  let srcFromNode: string | null = null;
  view.state.doc.descendants((node, pos) => {
    if (srcFromNode) return false;
    if (!node.type.name.toLowerCase().includes("image")) return;
    const domNode = view.nodeDOM(pos);
    if (domNode === img || (domNode instanceof HTMLElement && domNode.contains(img))) {
      srcFromNode = typeof node.attrs.src === "string" ? node.attrs.src : null;
      return false;
    }
    return undefined;
  });

  const vaultRoot = getVaultRoot();
  if (srcFromNode) {
    return resolveImageVaultPath(srcFromNode, notePath, vaultRoot);
  }

  const src = img.getAttribute("src");
  return src ? resolveImageVaultPath(src, notePath, vaultRoot) : null;
}

export async function deleteNoteImageFileOnRemove(
  vaultPath: string,
  notePath: string,
  noteContentAfterRemove: string,
): Promise<void> {
  if (!useAppStore.getState().deleteImageFilesOnRemove) return;

  const normalized = normalizePath(vaultPath);
  if (!isInNotePicFolder(normalized)) return;

  const picDir = normalizePath(notePicDirPath(notePath));
  if (normalized !== picDir && !normalized.startsWith(`${picDir}/`)) return;

  const vaultRoot = getVaultRoot();
  if (markdownReferencesImage(noteContentAfterRemove, normalized, notePath, vaultRoot)) return;

  const mdFiles = await vaultService.listMarkdown();
  for (const { path } of mdFiles) {
    if (normalizePath(path) === normalizePath(notePath)) continue;
    const content = await vaultService.read(path);
    if (markdownReferencesImage(content, normalized, path, vaultRoot)) return;
  }

  const adapter = vaultService.getAdapter();
  if (!adapter || !(await adapter.exists(normalized))) return;

  await vaultService.deletePath(normalized, "file");
  useAppStore.getState().refreshTree();
}
