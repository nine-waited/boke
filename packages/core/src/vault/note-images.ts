import { isImage, joinPath, normalizePath } from "./types.js";

export const NOTE_PIC_SUFFIX = "_pic";

/** Normalize markdown image URLs: angle brackets, file://, URI encoding, slashes. */
export function normalizeMarkdownAssetRef(raw: string): string {
  let next = raw.trim();
  if (next.startsWith("<") && next.endsWith(">")) {
    next = next.slice(1, -1).trim();
  }
  next = next.replace(/\\/g, "/");

  if (/^file:/i.test(next)) {
    try {
      const url = new URL(next);
      next = decodeURIComponent(url.pathname);
      if (/^\/[a-zA-Z]:\//.test(next)) {
        next = next.slice(1);
      }
    } catch {
      next = next.replace(/^file:\/\/\/+/i, "").replace(/^file:\/\//i, "");
      try {
        next = decodeURIComponent(next);
      } catch {
        // keep decoded best-effort path
      }
    }
  } else {
    try {
      next = decodeURIComponent(next);
    } catch {
      // keep literal path
    }
  }

  return next;
}

/** Map an absolute filesystem path under `vaultRoot` to a vault-relative path. */
export function absolutePathToVaultRelative(absPath: string, vaultRoot: string): string | null {
  const norm = normalizeMarkdownAssetRef(absPath);
  const root = normalizeMarkdownAssetRef(vaultRoot).replace(/\/$/, "");
  if (!/^[a-zA-Z]:\//.test(norm) || !/^[a-zA-Z]:\//.test(root)) return null;

  const normLower = norm.toLowerCase();
  const rootLower = root.toLowerCase();
  if (normLower === rootLower) return "";
  if (!normLower.startsWith(`${rootLower}/`)) return null;

  return normalizePath(norm.slice(root.length).replace(/^\//, ""));
}

function decodeImageRef(raw: string): string {
  return normalizeMarkdownAssetRef(raw);
}

/** Directory containing the note file, e.g. `notes/sub` for `notes/sub/foo.md`. */
export function noteDirectoryPath(mdPath: string): string {
  const normalized = normalizePath(mdPath);
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(0, slash) : "";
}

/** Collapse `.` / `..` segments in a vault-relative path. */
export function resolvePathSegments(path: string): string {
  const parts = normalizePath(path).split("/");
  const stack: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (stack.length > 0) stack.pop();
      continue;
    }
    stack.push(part);
  }
  return stack.join("/");
}

/**
 * Resolve an image reference from markdown against a note path.
 * Handles `foo_pic/image.png`, vault-root paths like `notes/sub/foo_pic/x.png`, and `/attachments/x.png`.
 */
export function resolveNoteImageVaultPath(imageRef: string, notePath: string): string | null {
  if (!imageRef || !notePath) return null;

  const raw = imageRef.replace(/\\/g, "/");
  const norm = resolvePathSegments(decodeImageRef(imageRef));
  if (!norm || /^https?:\/\//i.test(norm) || norm.startsWith("data:") || norm.startsWith("blob:")) {
    return null;
  }
  if (/^[a-zA-Z]:\//.test(norm)) return null;

  let vaultPath = norm;
  const noteDir = noteDirectoryPath(notePath);

  if (raw.trimStart().startsWith("/")) {
    vaultPath = norm;
  } else if (noteDir && !norm.startsWith(`${noteDir}/`)) {
    vaultPath = joinPath(noteDir, norm);
  }

  vaultPath = resolvePathSegments(vaultPath);
  return isImage(vaultPath) ? vaultPath : null;
}

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
  const path = toMarkdownAssetPath(imagePath);
  const dest = /[\s<>()]/.test(path) ? `<${path}>` : path;
  return `![${alt}](${dest})`;
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
