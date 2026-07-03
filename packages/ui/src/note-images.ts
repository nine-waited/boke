import { formatImageMarkdown, normalizePath } from "@boke/core";
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

  const normSrc = src.replace(/\\/g, "/");
  const root =
    adapter.kind === "tauri" && "getRootPath" in adapter
      ? (adapter as { getRootPath(): string }).getRootPath().replace(/\\/g, "/").replace(/\/$/, "")
      : null;

  if (root && normSrc.toLowerCase().startsWith(`${root.toLowerCase()}/`)) {
    const rel = normalizePath(normSrc.slice(root.length));
    return vaultService.getAssetUrl(rel);
  }

  if (!/^[a-zA-Z]:\//.test(normSrc) && !normSrc.startsWith("/")) {
    try {
      return await vaultService.getAssetUrl(normalizePath(normSrc));
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
