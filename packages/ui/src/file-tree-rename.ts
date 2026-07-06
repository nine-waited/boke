type Listener = () => void;

class FileTreeRenameStore {
  private pendingPath: string | null = null;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  requestRename(path: string): void {
    this.pendingPath = path;
    for (const listener of this.listeners) listener();
  }

  consumePendingRename(): string | null {
    const path = this.pendingPath;
    this.pendingPath = null;
    return path;
  }
}

export const fileTreeRename = new FileTreeRenameStore();
