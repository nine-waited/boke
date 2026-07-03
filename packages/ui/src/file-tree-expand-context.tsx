import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { workspaceStore } from "./store.js";

interface FileTreeExpandContextValue {
  collapseGeneration: number;
  collapseAll: () => void;
  revealGeneration: number;
  revealTargetPath: string | null;
  revealActiveFile: () => void;
}

const FileTreeExpandContext = createContext<FileTreeExpandContextValue | null>(null);

export function FileTreeExpandProvider({ children }: { children: ReactNode }) {
  const [collapseGeneration, setCollapseGeneration] = useState(0);
  const [revealGeneration, setRevealGeneration] = useState(0);
  const [revealTargetPath, setRevealTargetPath] = useState<string | null>(null);

  const collapseAll = useCallback(() => {
    setCollapseGeneration((generation) => generation + 1);
  }, []);

  const revealActiveFile = useCallback(() => {
    const path = workspaceStore.getActivePath();
    if (!path) return;
    setRevealTargetPath(path);
    setRevealGeneration((generation) => generation + 1);
  }, []);

  return (
    <FileTreeExpandContext.Provider
      value={{
        collapseGeneration,
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

export function useFileTreeCollapseGeneration(): number {
  return useFileTreeExpand().collapseGeneration;
}

export function useFileTreeReveal(): Pick<FileTreeExpandContextValue, "revealGeneration" | "revealTargetPath"> {
  const { revealGeneration, revealTargetPath } = useFileTreeExpand();
  return { revealGeneration, revealTargetPath };
}
