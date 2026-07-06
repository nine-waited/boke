import { workspaceStore } from "./store.js";

type Listener = () => void;

class FileTreeSelectionStore {
  private selectedFolderPath: string | null = null;
  private selectedFilePath: string | null = null;
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  getSelectedFolderPath(): string | null {
    return this.selectedFolderPath;
  }

  getSelectedFilePath(): string | null {
    return this.selectedFilePath;
  }

  setSelectedFolderPath(path: string | null): void {
    if (this.selectedFolderPath === path && (path === null || this.selectedFilePath === null)) {
      return;
    }
    this.selectedFolderPath = path;
    if (path !== null) {
      this.selectedFilePath = null;
    }
    this.notify();
  }

  setSelectedFilePath(path: string | null): void {
    if (this.selectedFilePath === path && (path === null || this.selectedFolderPath === null)) {
      return;
    }
    this.selectedFilePath = path;
    if (path !== null) {
      this.selectedFolderPath = null;
    }
    this.notify();
  }

  clearSelectedFolder(): void {
    this.setSelectedFolderPath(null);
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
