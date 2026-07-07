import { isHiddenPath, isNotePicFolder } from "@chestnut/core";
import type { VaultEntry } from "@chestnut/core";

export function isFileTreeEntryVisible(entry: VaultEntry, showNotePicFolders: boolean): boolean {
  if (isHiddenPath(entry.path)) return false;
  if (!showNotePicFolders && entry.kind === "directory" && isNotePicFolder(entry.path)) {
    return false;
  }
  return true;
}
