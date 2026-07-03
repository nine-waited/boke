import { isImage, joinPath, normalizePath } from "@boke/core";
import { workspaceStore } from "./store.js";

const displayUrlToVaultPath = new Map<string, string>();

export function trackImageDisplayUrl(displayUrl: string, vaultPath: string): void {
  displayUrlToVaultPath.set(displayUrl, normalizePath(vaultPath));
}

export function resolveImageVaultPath(src: string, notePath?: string): string | null {
  if (!src) return null;

  const tracked = displayUrlToVaultPath.get(src);
  if (tracked) return tracked;

  if (src.startsWith("blob:") || src.startsWith("data:") || /^https?:\/\//i.test(src)) {
    return null;
  }

  const norm = src.replace(/\\/g, "/");
  if (/^[a-zA-Z]:\//.test(norm) || norm.startsWith("/")) return null;

  let vaultPath = norm;
  if (!norm.includes("/") && notePath) {
    const slash = notePath.lastIndexOf("/");
    const dir = slash >= 0 ? notePath.slice(0, slash) : "";
    vaultPath = dir ? joinPath(dir, norm) : norm;
  }

  vaultPath = normalizePath(vaultPath);
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
