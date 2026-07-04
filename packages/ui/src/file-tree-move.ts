import {
  isExportTargetFolder,
  isInExportTargetFolder,
  isInNotePicFolder,
  isNotePicFolder,
  normalizePath,
} from "@chestnut/core";

export type FileTreeDragKind = "file" | "directory";

function parentDir(path: string): string {
  const normalized = normalizePath(path);
  const slash = normalized.lastIndexOf("/");
  return slash >= 0 ? normalized.slice(0, slash) : "";
}

export function canDragFileTreeEntry(path: string, kind: FileTreeDragKind): boolean {
  const normalized = normalizePath(path);
  if (kind === "directory") {
    if (isNotePicFolder(normalized) || isExportTargetFolder(normalized)) return false;
  }
  if (isInNotePicFolder(normalized) || isInExportTargetFolder(normalized)) return false;
  return true;
}

export function canDropFileTreeEntry(
  sourcePath: string,
  sourceKind: FileTreeDragKind,
  targetDir: string,
): boolean {
  const source = normalizePath(sourcePath);
  const target = normalizePath(targetDir);
  if (target && (isInNotePicFolder(target) || isInExportTargetFolder(target))) return false;
  if (sourceKind === "directory") {
    if (target === source || target.startsWith(`${source}/`)) return false;
  }
  return parentDir(source) !== target;
}

export const FILE_TREE_DRAG_MIME = "application/x-chestnut-file-tree";

export interface FileTreeDragPayload {
  path: string;
  kind: FileTreeDragKind;
}

export function encodeFileTreeDragPayload(payload: FileTreeDragPayload): string {
  return JSON.stringify(payload);
}

export function decodeFileTreeDragPayload(raw: string): FileTreeDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as FileTreeDragPayload;
    if (
      parsed &&
      typeof parsed.path === "string" &&
      (parsed.kind === "file" || parsed.kind === "directory")
    ) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}
