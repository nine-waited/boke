export type LeafType = "empty" | "markdown" | "excalidraw" | "image" | "graph" | "settings" | "publish";

export type LeafMode = "live" | "source";

export function normalizeLeafMode(mode?: string): LeafMode {
  return mode === "source" ? "source" : "live";
}

export interface Leaf {
  id: string;
  type: LeafType;
  path?: string;
  mode?: LeafMode;
  pinned?: boolean;
}

export type WorkspaceListener = () => void;

export interface WorkspaceState {
  leaves: Leaf[];
  activeId: string;
  active: Leaf | null;
}

let nextId = 1;
function uid(): string {
  return `leaf-${nextId++}`;
}

export class WorkspaceStore {
  private leaves: Leaf[] = [{ id: uid(), type: "empty" }];
  private activeId: string = this.leaves[0].id;
  private listeners = new Set<WorkspaceListener>();
  private snapshot: WorkspaceState = this.buildSnapshot();

  private buildSnapshot(): WorkspaceState {
    return {
      leaves: [...this.leaves],
      activeId: this.activeId,
      active: this.leaves.find((l) => l.id === this.activeId) ?? null,
    };
  }

  getState(): WorkspaceState {
    return this.snapshot;
  }

  subscribe(listener: WorkspaceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.snapshot = this.buildSnapshot();
    for (const l of this.listeners) l();
  }

  openFile(path: string, opts?: { newTab?: boolean; mode?: LeafMode }): string {
    const mode = opts?.mode ?? "live";
    if (!opts?.newTab) {
      const active = this.leaves.find((l) => l.id === this.activeId);
      if (active && !active.pinned && (active.type === "empty" || active.type === "markdown")) {
        active.type = "markdown";
        active.path = path;
        active.mode = mode;
        this.notify();
        return active.id;
      }
      const existing = this.leaves.find((l) => l.type === "markdown" && l.path === path);
      if (existing) {
        this.activeId = existing.id;
        existing.mode = mode;
        this.notify();
        return existing.id;
      }
    }
    const leaf: Leaf = { id: uid(), type: "markdown", path, mode };
    this.leaves.push(leaf);
    this.activeId = leaf.id;
    this.notify();
    return leaf.id;
  }

  openExcalidraw(path: string, opts?: { newTab?: boolean }): string {
    if (!opts?.newTab) {
      const active = this.leaves.find((l) => l.id === this.activeId);
      if (active && !active.pinned && (active.type === "empty" || active.type === "excalidraw")) {
        active.type = "excalidraw";
        active.path = path;
        this.notify();
        return active.id;
      }
      const existing = this.leaves.find((l) => l.type === "excalidraw" && l.path === path);
      if (existing) {
        this.activeId = existing.id;
        this.notify();
        return existing.id;
      }
    }
    const leaf: Leaf = { id: uid(), type: "excalidraw", path };
    this.leaves.push(leaf);
    this.activeId = leaf.id;
    this.notify();
    return leaf.id;
  }

  openImage(path: string, opts?: { newTab?: boolean }): string {
    if (!opts?.newTab) {
      const active = this.leaves.find((l) => l.id === this.activeId);
      if (active && !active.pinned && (active.type === "empty" || active.type === "image")) {
        active.type = "image";
        active.path = path;
        active.mode = undefined;
        this.notify();
        return active.id;
      }
      const existing = this.leaves.find((l) => l.type === "image" && l.path === path);
      if (existing) {
        this.activeId = existing.id;
        this.notify();
        return existing.id;
      }
    }
    const leaf: Leaf = { id: uid(), type: "image", path };
    this.leaves.push(leaf);
    this.activeId = leaf.id;
    this.notify();
    return leaf.id;
  }

  openGraph(): string {
    const existing = this.leaves.find((l) => l.type === "graph");
    if (existing) {
      this.activeId = existing.id;
      this.notify();
      return existing.id;
    }
    const leaf: Leaf = { id: uid(), type: "graph" };
    this.leaves.push(leaf);
    this.activeId = leaf.id;
    this.notify();
    return leaf.id;
  }

  openSettings(): string {
    const existing = this.leaves.find((l) => l.type === "settings");
    if (existing) {
      this.activeId = existing.id;
      this.notify();
      return existing.id;
    }
    const leaf: Leaf = { id: uid(), type: "settings" };
    this.leaves.push(leaf);
    this.activeId = leaf.id;
    this.notify();
    return leaf.id;
  }

  openPublish(): string {
    const existing = this.leaves.find((l) => l.type === "publish");
    if (existing) {
      this.activeId = existing.id;
      this.notify();
      return existing.id;
    }
    const leaf: Leaf = { id: uid(), type: "publish" };
    this.leaves.push(leaf);
    this.activeId = leaf.id;
    this.notify();
    return leaf.id;
  }

  setActive(id: string): void {
    if (this.leaves.some((l) => l.id === id)) {
      this.activeId = id;
      this.notify();
    }
  }

  closeTab(id: string): void {
    if (this.leaves.length <= 1) return;
    this.closeTabs([id]);
  }

  closeOtherTabs(id: string): void {
    const toClose = this.leaves.filter((l) => l.id !== id).map((l) => l.id);
    if (toClose.length === 0) return;
    this.activeId = id;
    this.closeTabs(toClose);
  }

  closeTabsToLeft(id: string): void {
    const idx = this.leaves.findIndex((l) => l.id === id);
    if (idx <= 0) return;
    this.closeTabs(this.leaves.slice(0, idx).map((l) => l.id));
  }

  closeTabsToRight(id: string): void {
    const idx = this.leaves.findIndex((l) => l.id === id);
    if (idx < 0 || idx >= this.leaves.length - 1) return;
    this.closeTabs(this.leaves.slice(idx + 1).map((l) => l.id));
  }

  closeAllTabs(keepId: string): void {
    const toClose = this.leaves.filter((l) => l.id !== keepId).map((l) => l.id);
    if (toClose.length === 0) return;
    this.activeId = keepId;
    this.closeTabs(toClose);
  }

  private closeTabs(idsToClose: string[]): void {
    if (idsToClose.length === 0) return;
    const closeSet = new Set(idsToClose);
    const next = this.leaves.filter((l) => !closeSet.has(l.id));
    if (next.length === 0 || next.length === this.leaves.length) return;

    if (closeSet.has(this.activeId)) {
      const oldIdx = this.leaves.findIndex((l) => l.id === this.activeId);
      let nextActiveId = next[0].id;
      for (let i = oldIdx; i >= 0; i--) {
        const leaf = this.leaves[i];
        if (!closeSet.has(leaf.id)) {
          nextActiveId = leaf.id;
          break;
        }
      }
      this.activeId = nextActiveId;
    }

    this.leaves = next;
    this.notify();
  }

  setMode(id: string, mode: LeafMode): void {
    const leaf = this.leaves.find((l) => l.id === id);
    if (leaf && leaf.type === "markdown") {
      leaf.mode = normalizeLeafMode(mode);
      this.notify();
    }
  }

  updatePath(leafId: string, newPath: string): void {
    const leaf = this.leaves.find((l) => l.id === leafId);
    if (leaf && leaf.path) {
      leaf.path = newPath;
      this.notify();
    }
  }

  renamePath(oldPath: string, newPath: string): void {
    let changed = false;
    for (const leaf of this.leaves) {
      if (leaf.path === oldPath) {
        leaf.path = newPath;
        changed = true;
      }
    }
    if (changed) this.notify();
  }

  renamePathPrefix(oldPrefix: string, newPrefix: string): void {
    let changed = false;
    const prefix = `${oldPrefix}/`;
    for (const leaf of this.leaves) {
      if (!leaf.path) continue;
      if (leaf.path === oldPrefix || leaf.path.startsWith(prefix)) {
        leaf.path = `${newPrefix}${leaf.path.slice(oldPrefix.length)}`;
        changed = true;
      }
    }
    if (changed) this.notify();
  }

  clearPathsForDelete(deletedPath: string, isDirectory: boolean): void {
    let changed = false;
    const prefix = `${deletedPath}/`;
    for (const leaf of this.leaves) {
      if (!leaf.path) continue;
      const hit = isDirectory
        ? leaf.path === deletedPath || leaf.path.startsWith(prefix)
        : leaf.path === deletedPath;
      if (!hit) continue;
      leaf.type = "empty";
      leaf.path = undefined;
      leaf.mode = undefined;
      changed = true;
    }
    if (changed) this.notify();
  }

  getActivePath(): string | null {
    const active = this.leaves.find((l) => l.id === this.activeId);
    return active?.path ?? null;
  }
}

export const workspaceStore = new WorkspaceStore();
