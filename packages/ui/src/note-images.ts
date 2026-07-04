import { absolutePathToVaultRelative, formatImageMarkdown, normalizeMarkdownAssetRef, normalizePath } from "@chestnut/core";
import { trackImageDisplayUrl } from "./image-open.js";
import { useAppStore, vaultService } from "./store.js";

export { formatImageMarkdown };

export function getClipboardImageFile(data: DataTransfer | null): File | null {
  if (!data) return null;

  for (const item of data.items) {
    if (item.kind !== "file" || !item.type.startsWith("image/")) continue;
    const file = item.getAsFile();
    if (file) return file;
  }

  return null;
}

export async function resolveImageSrcForDisplay(src: string): Promise<string> {
  if (!src || src.startsWith("blob:") || src.startsWith("data:") || /^https?:\/\//i.test(src)) {
    return src;
  }

  const adapter = vaultService.getAdapter();
  if (!adapter) return src;

  const normSrc = normalizeMarkdownAssetRef(src);
  const root =
    adapter.kind === "tauri" && "getRootPath" in adapter
      ? (adapter as { getRootPath(): string }).getRootPath().replace(/\\/g, "/").replace(/\/$/, "")
      : null;

  if (root) {
    const rel = absolutePathToVaultRelative(normSrc, root);
    if (rel) {
      const url = await vaultService.getAssetUrl(rel);
      trackImageDisplayUrl(url, rel);
      return url;
    }
  }

  if (!/^[a-zA-Z]:\//.test(normSrc) && !normSrc.startsWith("/")) {
    try {
      const rel = normalizePath(normSrc);
      const url = await vaultService.getAssetUrl(rel);
      trackImageDisplayUrl(url, rel);
      return url;
    } catch {
      return src;
    }
  }

  return src;
}

export async function savePastedNoteImage(mdPath: string, file: File | Blob): Promise<string> {
  const imagePath = await vaultService.saveNoteImage(mdPath, file);
  useAppStore.getState().refreshTree();
  return imagePath;
}
