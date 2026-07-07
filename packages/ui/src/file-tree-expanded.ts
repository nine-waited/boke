import { remapVaultPathUnderPrefix } from "./vault-path-remap.js";

type Listener = () => void;

class FileTreeExpandedStore {
  private expandedPaths = new Set<string>();
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  isExpanded(dir: string): boolean {
    if (!dir) return true;
    return this.expandedPaths.has(dir);
  }

  setExpanded(dir: string, expanded: boolean): void {
    if (!dir) return;
    const had = this.expandedPaths.has(dir);
    if (expanded) this.expandedPaths.add(dir);
    else this.expandedPaths.delete(dir);
    if (had !== expanded) this.notify();
  }

  collapseAll(): void {
    if (this.expandedPaths.size === 0) return;
    this.expandedPaths.clear();
    this.notify();
  }

  remapVaultPathPrefix(oldPrefix: string, newPrefix: string): void {
    const next = new Set<string>();
    for (const path of this.expandedPaths) {
      next.add(remapVaultPathUnderPrefix(path, oldPrefix, newPrefix));
    }
    this.expandedPaths = next;
    this.notify();
  }
}

export const fileTreeExpanded = new FileTreeExpandedStore();
