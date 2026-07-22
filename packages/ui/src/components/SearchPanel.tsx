import { useEffect, useState } from "react";
import { useT } from "../i18n/index.js";
import { searchIndex, workspaceStore, useAppStore } from "../store.js";
import { fileTreeSelection } from "../file-tree-selection.js";
import { revealFileInTree, revealFileInTreeWhenReady } from "../file-tree-expand-context.js";

export function SearchPanel() {
  const t = useT();
  const open = useAppStore((s) => s.searchOpen);
  const setOpen = useAppStore((s) => s.setSearchOpen);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReturnType<typeof searchIndex.search>>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    setResults(searchIndex.search(query));
  }, [query, open]);

  if (!open) return null;

  const openResult = (path: string) => {
    fileTreeSelection.selectExclusive(path, "file");
    workspaceStore.openFile(path);
    setOpen(false);
    revealFileInTree(path);
    void revealFileInTreeWhenReady(path);
  };

  return (
    <div className="boke-modal-overlay" onClick={() => setOpen(false)}>
      <div className="boke-palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder={t("palette.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="boke-palette-list">
          {results.map((r) => (
            <div key={r.path} className="boke-palette-item" onClick={() => openResult(r.path)}>
              {r.title}
              <small>{r.path}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
