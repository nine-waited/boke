import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface FileTreeExpandContextValue {
  collapseGeneration: number;
  collapseAll: () => void;
}

const FileTreeExpandContext = createContext<FileTreeExpandContextValue | null>(null);

export function FileTreeExpandProvider({ children }: { children: ReactNode }) {
  const [collapseGeneration, setCollapseGeneration] = useState(0);
  const collapseAll = useCallback(() => {
    setCollapseGeneration((generation) => generation + 1);
  }, []);

  return (
    <FileTreeExpandContext.Provider value={{ collapseGeneration, collapseAll }}>
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
