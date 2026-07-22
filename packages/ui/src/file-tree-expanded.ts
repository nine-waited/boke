import { remapVaultPathUnderPrefix } from "./vault-path-remap.js";

type Listener = () => void;
type PersistHandler = (paths: string[]) => void;

export function normalizeFileTreeExpandedPaths(paths: unknown): string[] {
  if (!Array.isArray(paths)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  for (const item of paths) {
    if (typeof item !== "string" || !item || seen.has(item)) continue;
    seen.add(item);
    next.push(item);
  }
  return next;
}

function expandedPathsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  for (const path of b) {
    if (!set.has(path)) return false;
  }
  return true;
}

class FileTreeExpandedStore {
  private expandedPaths = new Set<string>();
  private listeners = new Set<Listener>();
  private persistHandler: PersistHandler | null = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private persist(): void {
    this.persistHandler?.(Array.from(this.expandedPaths));
  }

  /** Restore expanded folders from persisted settings (before React mounts). */
  hydrate(paths: string[]): void {
    this.expandedPaths = new Set(normalizeFileTreeExpandedPaths(paths));
  }

  setPersistHandler(handler: PersistHandler): void {
    this.persistHandler = handler;
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
    if (had !== expanded) {
      this.persist();
      this.notify();
    }
  }

  collapseAll(): void {
    if (this.expandedPaths.size === 0) return;
    this.expandedPaths.clear();
    this.persist();
    this.notify();
  }

  remapVaultPathPrefix(oldPrefix: string, newPrefix: string): void {
    const next = new Set<string>();
    for (const path of this.expandedPaths) {
      next.add(remapVaultPathUnderPrefix(path, oldPrefix, newPrefix));
    }
    if (expandedPathsEqual(Array.from(next), Array.from(this.expandedPaths))) return;
    this.expandedPaths = next;
    this.persist();
    this.notify();
  }
}

export const fileTreeExpanded = new FileTreeExpandedStore();
