import { isImage, normalizePath, normalizeMarkdownAssetRef, absolutePathToVaultRelative, resolveNoteImageVaultPath } from "@chestnut/core";
import { workspaceStore } from "./store.js";

const displayUrlToVaultPath = new Map<string, string>();

export function trackImageDisplayUrl(displayUrl: string, vaultPath: string): void {
  displayUrlToVaultPath.set(displayUrl, normalizePath(vaultPath));
}

export function resolveImageVaultPath(src: string, notePath?: string, vaultRoot?: string | null): string | null {
  if (!src) return null;

  const tracked = displayUrlToVaultPath.get(src);
  if (tracked) return tracked;

  const normalized = normalizeMarkdownAssetRef(src);

  if (normalized.startsWith("blob:") || normalized.startsWith("data:") || /^https?:\/\//i.test(normalized)) {
    return null;
  }

  if (/^[a-zA-Z]:\//.test(normalized)) {
    if (vaultRoot) {
      const rel = absolutePathToVaultRelative(normalized, vaultRoot);
      if (rel && isImage(rel)) return rel;
    }
    return null;
  }

  if (normalized.startsWith("/")) return null;

  if (notePath) {
    const resolved = resolveNoteImageVaultPath(normalized, notePath);
    if (resolved) return resolved;
  }

  const vaultPath = normalizePath(normalized);
  return isImage(vaultPath) ? vaultPath : null;
}

export function openImageViewer(vaultPath: string): void {
  const normalized = normalizePath(vaultPath);
  if (!isImage(normalized)) return;
  workspaceStore.openImage(normalized);
}

export function openImageFromElement(img: HTMLImageElement, notePath?: string): void {
  const dataPath = img.dataset.vaultPath || img.dataset.embed;
  if (dataPath && isImage(dataPath)) {
    openImageViewer(dataPath);
    return;
  }

  const src = img.getAttribute("src");
  if (!src) return;

  const resolved = resolveImageVaultPath(src, notePath);
  if (resolved) openImageViewer(resolved);
}

export function attachImageClickHandlers(container: HTMLElement, notePath?: string): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const img = target.closest("img");
    if (!img || !container.contains(img)) return;

    const activeIdBefore = workspaceStore.getState().activeId;
    openImageFromElement(img, notePath);
    if (workspaceStore.getState().activeId !== activeIdBefore) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  container.addEventListener("click", onClick);
  return () => container.removeEventListener("click", onClick);
}
