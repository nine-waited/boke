import { isExcalidraw, isMarkdown } from "@chestnut/core";
import { remapVaultPathUnderPrefix } from "./vault-path-remap.js";

export function isPinnableVaultFile(path: string): boolean {
  return isMarkdown(path) || isExcalidraw(path);
}

export function normalizePinnedFilePaths(paths: unknown): string[] {
  if (!Array.isArray(paths)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of paths) {
    if (typeof item !== "string" || !item || !isPinnableVaultFile(item) || seen.has(item)) continue;
    seen.add(item);
    next.push(item);
  }
  return next;
}

export function remapPinnedFilePath(paths: string[], oldPath: string, newPath: string): string[] {
  if (!paths.includes(oldPath)) return paths;
  const next = paths.map((path) => (path === oldPath ? newPath : path));
  return normalizePinnedFilePaths(next);
}

export function remapPinnedFilePathPrefix(paths: string[], oldPrefix: string, newPrefix: string): string[] {
  const next = paths.map((path) => remapVaultPathUnderPrefix(path, oldPrefix, newPrefix));
  return normalizePinnedFilePaths(next);
}

export function removePinnedFilePathsUnder(
  paths: string[],
  deletedPath: string,
  isDirectory: boolean,
): string[] {
  if (!isDirectory) {
    return paths.filter((path) => path !== deletedPath);
  }
  return paths.filter(
    (path) => path !== deletedPath && !path.startsWith(`${deletedPath}/`),
  );
}

/** Move `path` so it sits before `insertBeforeIndex` in the original list (0..length). */
export function reorderPinnedFilePaths(
  paths: string[],
  path: string,
  insertBeforeIndex: number,
): string[] {
  const from = paths.indexOf(path);
  if (from < 0) return paths;
  let target = Math.max(0, Math.min(insertBeforeIndex, paths.length));
  if (from < target) target -= 1;
  if (target === from) return paths;
  const next = paths.slice();
  next.splice(from, 1);
  next.splice(target, 0, path);
  return next;
}
