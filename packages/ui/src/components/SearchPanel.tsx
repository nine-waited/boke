import { useEffect, useState } from "react";
import { searchIndex, workspaceStore, useAppStore } from "../store.js";

export function SearchPanel() {
  const open = useAppStore((s) => s.searchOpen);
  const setOpen = useAppStore((s) => s.setSearchOpen);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ReturnType<typeof searchIndex.search>>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    setResults(searchIndex.search(query));
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="boke-modal-overlay" onClick={() => setOpen(false)}>
      <div className="boke-palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Search notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="boke-palette-list">
          {results.map((r) => (
            <div
              key={r.path}
              className="boke-palette-item"
              onClick={() => {
                workspaceStore.openFile(r.path);
                setOpen(false);
              }}
            >
              {r.title}
              <small>{r.path}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
