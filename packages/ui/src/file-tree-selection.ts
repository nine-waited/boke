import { isNotePicFolder } from "@chestnut/core";
import { workspaceStore } from "./store.js";
import { remapVaultPathUnderPrefix, remapVaultPathUnderPrefixNullable } from "./vault-path-remap.js";

type Listener = () => void;

export type FileTreeSelectionKind = "file" | "directory";

export interface FileTreeSelectionEntry {
  path: string;
  kind: FileTreeSelectionKind;
}

class FileTreeSelectionStore {
  private selected = new Map<string, FileTreeSelectionKind>();
  /** Last interacted item — used by new-item parent / exclusive API. */
  private primaryPath: string | null = null;
  /** Anchor for Shift+click range selection. */
  private anchorPath: string | null = null;
  private revision = 0;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.revision += 1;
    for (const listener of this.listeners) listener();
  }

  getRevision(): number {
    return this.revision;
  }

  isSelected(path: string): boolean {
    return this.selected.has(path);
  }

  hasSelection(): boolean {
    return this.selected.size > 0;
  }

  getSelectedEntries(): FileTreeSelectionEntry[] {
    return [...this.selected.entries()].map(([path, kind]) => ({ path, kind }));
  }

  getPrimaryPath(): string | null {
    return this.primaryPath;
  }

  getAnchorPath(): string | null {
    return this.anchorPath;
  }

  /** Primary folder when the primary selection is a directory (backward compatible). */
  getSelectedFolderPath(): string | null {
    if (!this.primaryPath) return null;
    return this.selected.get(this.primaryPath) === "directory" ? this.primaryPath : null;
  }

  /** Primary file when the primary selection is a file (backward compatible). */
  getSelectedFilePath(): string | null {
    if (!this.primaryPath) return null;
    return this.selected.get(this.primaryPath) === "file" ? this.primaryPath : null;
  }

  setSelectedFolderPath(path: string | null): void {
    if (path === null) {
      this.clear();
      return;
    }
    this.replaceWith([{ path, kind: "directory" }], path);
  }

  setSelectedFilePath(path: string | null): void {
    if (path === null) {
      this.clear();
      return;
    }
    this.replaceWith([{ path, kind: "file" }], path);
  }

  clearSelectedFolder(): void {
    const folder = this.getSelectedFolderPath();
    if (!folder) return;
    this.removePath(folder);
  }

  clear(): void {
    if (this.selected.size === 0 && this.primaryPath === null && this.anchorPath === null) return;
    this.selected.clear();
    this.primaryPath = null;
    this.anchorPath = null;
    this.notify();
  }

  /** Plain click: exclusive selection. */
  selectExclusive(path: string, kind: FileTreeSelectionKind): void {
    this.replaceWith([{ path, kind }], path);
  }

  /** Ctrl/Cmd+click: toggle membership. */
  togglePath(path: string, kind: FileTreeSelectionKind): void {
    if (this.selected.has(path)) {
      this.selected.delete(path);
      if (this.primaryPath === path) {
        this.primaryPath = this.selected.keys().next().value ?? null;
      }
      if (this.anchorPath === path) {
        this.anchorPath = this.primaryPath;
      }
    } else {
      this.selected.set(path, kind);
      this.primaryPath = path;
      this.anchorPath = path;
    }
    this.notify();
  }

  /**
   * Shift+click: select contiguous visible range from anchor to `path`.
   * `visible` must be DFS / on-screen order of currently visible rows.
   */
  selectRange(visible: FileTreeSelectionEntry[], path: string, kind: FileTreeSelectionKind): void {
    const anchor = this.anchorPath ?? this.primaryPath ?? path;
    const order = visible.map((entry) => entry.path);
    const from = order.indexOf(anchor);
    const to = order.indexOf(path);
    if (from < 0 || to < 0) {
      this.replaceWith([{ path, kind }], path);
      return;
    }
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    this.selected.clear();
    for (let i = lo; i <= hi; i++) {
      this.selected.set(visible[i].path, visible[i].kind);
    }
    this.primaryPath = path;
    if (this.anchorPath === null) this.anchorPath = path;
    this.notify();
  }

  /** Right-click: keep multi-selection if target is already selected; otherwise exclusive. */
  selectForContextMenu(path: string, kind: FileTreeSelectionKind): void {
    if (this.selected.has(path)) {
      this.primaryPath = path;
      this.notify();
      return;
    }
    this.replaceWith([{ path, kind }], path);
  }

  removePath(path: string): void {
    if (!this.selected.has(path)) return;
    this.selected.delete(path);
    if (this.primaryPath === path) {
      this.primaryPath = this.selected.keys().next().value ?? null;
    }
    if (this.anchorPath === path) {
      this.anchorPath = this.primaryPath;
    }
    this.notify();
  }

  /** Drop hidden `_pic` folders from selection when the user hides them. */
  deselectNotePicFolders(): void {
    let changed = false;
    for (const [path, kind] of [...this.selected]) {
      if (kind === "directory" && isNotePicFolder(path)) {
        this.selected.delete(path);
        changed = true;
      }
    }
    if (!changed) return;
    if (this.primaryPath && !this.selected.has(this.primaryPath)) {
      this.primaryPath = this.selected.keys().next().value ?? null;
    }
    if (this.anchorPath && !this.selected.has(this.anchorPath)) {
      this.anchorPath = this.primaryPath;
    }
    this.notify();
  }

  /** Keep selection in sync when a vault path is renamed or moved. */
  remapVaultPath(oldPath: string, newPath: string): void {
    if (!this.selected.has(oldPath) && this.primaryPath !== oldPath && this.anchorPath !== oldPath) {
      return;
    }
    const next = new Map<string, FileTreeSelectionKind>();
    for (const [path, kind] of this.selected) {
      next.set(path === oldPath ? newPath : path, kind);
    }
    this.selected = next;
    if (this.primaryPath === oldPath) this.primaryPath = newPath;
    if (this.anchorPath === oldPath) this.anchorPath = newPath;
    this.notify();
  }

  /** Keep selection in sync when a folder (and its descendants) is renamed or moved. */
  remapVaultPathPrefix(oldPrefix: string, newPrefix: string): void {
    const next = new Map<string, FileTreeSelectionKind>();
    let changed = false;
    for (const [path, kind] of this.selected) {
      const mapped = remapVaultPathUnderPrefix(path, oldPrefix, newPrefix);
      if (mapped !== path) changed = true;
      next.set(mapped, kind);
    }
    const nextPrimary = remapVaultPathUnderPrefixNullable(this.primaryPath, oldPrefix, newPrefix);
    const nextAnchor = remapVaultPathUnderPrefixNullable(this.anchorPath, oldPrefix, newPrefix);
    if (!changed && nextPrimary === this.primaryPath && nextAnchor === this.anchorPath) return;
    this.selected = next;
    this.primaryPath = nextPrimary;
    this.anchorPath = nextAnchor;
    this.notify();
  }

  private replaceWith(entries: FileTreeSelectionEntry[], primary: string | null): void {
    const sameSize = entries.length === this.selected.size;
    const sameMembers =
      sameSize &&
      entries.every((entry) => this.selected.get(entry.path) === entry.kind) &&
      this.primaryPath === primary &&
      this.anchorPath === primary;
    if (sameMembers) return;

    this.selected.clear();
    for (const entry of entries) {
      this.selected.set(entry.path, entry.kind);
    }
    this.primaryPath = primary;
    this.anchorPath = primary;
    this.notify();
  }
}

export const fileTreeSelection = new FileTreeSelectionStore();

export function parentDirOfVaultPath(path: string): string {
  const slash = path.lastIndexOf("/");
  return slash >= 0 ? path.slice(0, slash) : "";
}

/** Parent dir for sidebar / command “new item” actions. */
export function resolveNewItemParentDir(): string {
  const selectedFolder = fileTreeSelection.getSelectedFolderPath();
  if (selectedFolder) return selectedFolder;

  const activePath = workspaceStore.getActivePath();
  if (activePath) return parentDirOfVaultPath(activePath);

  return "";
}

export function collectVisibleFileTreeItems(
  treeRoot: HTMLElement,
): FileTreeSelectionEntry[] {
  const items: FileTreeSelectionEntry[] = [];
  for (const el of treeRoot.querySelectorAll<HTMLElement>("[data-file-tree-path]")) {
    const path = el.dataset.fileTreePath;
    if (!path) continue;
    const kind = el.dataset.fileTreeKind === "directory" ? "directory" : "file";
    items.push({ path, kind });
  }
  return items;
}
