import { joinPath, normalizePath } from "./types.js";

export const NOTE_PIC_SUFFIX = "_pic";

export function isNotePicFolder(pathOrName: string): boolean {
  const name = pathOrName.split("/").pop() ?? pathOrName;
  return name.endsWith(NOTE_PIC_SUFFIX);
}

/** True when `path` is a `_pic` folder or nested inside one. */
export function isInNotePicFolder(path: string): boolean {
  const normalized = normalizePath(path);
  if (!normalized) return false;
  return normalized.split("/").some((segment) => segment.endsWith(NOTE_PIC_SUFFIX));
}

function noteFileBaseName(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.(md|excalidraw)$/i, "");
}

/** Vault-relative directory for a note's images, e.g. `notes/MyNote_pic`. */
export function notePicDirPath(mdPath: string): string {
  const normalized = normalizePath(mdPath);
  const slash = normalized.lastIndexOf("/");
  const dir = slash >= 0 ? normalized.slice(0, slash) : "";
  const picDirName = `${noteFileBaseName(normalized)}${NOTE_PIC_SUFFIX}`;
  return dir ? joinPath(dir, picDirName) : picDirName;
}

export function toMarkdownAssetPath(path: string): string {
  return path.replace(/\\/g, "/");
}

export function formatImageMarkdown(imagePath: string, alt = ""): string {
  return `![${alt}](${toMarkdownAssetPath(imagePath)})`;
}

export function rewriteNotePicPaths(
  content: string,
  oldPicDir: string,
  newPicDir: string,
  oldAbsPicDir: string | null,
  newAbsPicDir: string | null,
): string {
  let next = content.split(oldPicDir).join(newPicDir);
  if (oldAbsPicDir && newAbsPicDir) {
    const oldAbs = toMarkdownAssetPath(oldAbsPicDir);
    const newAbs = toMarkdownAssetPath(newAbsPicDir);
    next = next.split(oldAbs).join(newAbs);
  }
  return next;
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return ".png";
  }
}

function defaultImageStamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    pad(date.getFullYear() % 100) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

function isGenericImageName(name: string): boolean {
  const base = name.trim().toLowerCase();
  return !base || base === "image.png" || base === "image.jpeg" || base === "image.jpg";
}

export function sanitizeImageFileName(name: string, mime = "image/png"): string {
  const trimmed = name.trim().replace(/[^\w.\-()\u4e00-\u9fff]/g, "_");
  if (isGenericImageName(trimmed)) {
    return `image-${defaultImageStamp()}${extFromMime(mime)}`;
  }
  if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(trimmed)) {
    return `${trimmed}${extFromMime(mime)}`;
  }
  return trimmed;
}
