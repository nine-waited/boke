import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fileTreeExpanded } from "./file-tree-expanded.js";
import { workspaceStore } from "./store.js";

interface FileTreeExpandContextValue {
  collapseAll: () => void;
  revealGeneration: number;
  revealTargetPath: string | null;
  revealActiveFile: () => void;
}

const FileTreeExpandContext = createContext<FileTreeExpandContextValue | null>(null);

let revealPathInTree: ((path: string) => void) | null = null;

/** Scroll the file tree to `path`, expanding parent folders as needed. */
export function revealFileInTree(path: string): void {
  revealPathInTree?.(path);
}

/** Reveal after async tree refresh; retries until folders expand and the row mounts. */
export async function revealFileInTreeWhenReady(path: string): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt++) {
    revealFileInTree(path);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }
}

export function FileTreeExpandProvider({ children }: { children: ReactNode }) {
  const [revealGeneration, setRevealGeneration] = useState(0);
  const [revealTargetPath, setRevealTargetPath] = useState<string | null>(null);

  const collapseAll = useCallback(() => {
    fileTreeExpanded.collapseAll();
  }, []);

  const revealFile = useCallback((path: string) => {
    setRevealTargetPath(path);
    setRevealGeneration((generation) => generation + 1);
  }, []);

  useEffect(() => {
    revealPathInTree = revealFile;
    return () => {
      revealPathInTree = null;
    };
  }, [revealFile]);

  const revealActiveFile = useCallback(() => {
    const path = workspaceStore.getActivePath();
    if (!path) return;
    revealFile(path);
  }, [revealFile]);

  return (
    <FileTreeExpandContext.Provider
      value={{
        collapseAll,
        revealGeneration,
        revealTargetPath,
        revealActiveFile,
      }}
    >
      {children}
    </FileTreeExpandContext.Provider>
  );
}

export function useFileTreeExpand(): FileTreeExpandContextValue {
  const ctx = useContext(FileTreeExpandContext);
  if (!ctx) {
    throw new Error("useFileTreeExpand must be used within FileTreeExpandProvider");
  }
  return ctx;
}

export function useFileTreeReveal(): Pick<FileTreeExpandContextValue, "revealGeneration" | "revealTargetPath"> {
  const { revealGeneration, revealTargetPath } = useFileTreeExpand();
  return { revealGeneration, revealTargetPath };
}
