import { useEffect, useMemo, useRef, useState } from "react";
import { vaultService, workspaceStore, useAppStore } from "../store.js";
import { deleteVaultPath } from "../note-actions.js";

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [files, setFiles] = useState<Array<{ path: string; title: string }>>([]);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const loadFiles = () => {
    vaultService.listMarkdown().then((list) => {
      setFiles(
        list.map((f) => ({
          path: f.path,
          title: f.path.split("/").pop()?.replace(/\.md$/, "") ?? f.path,
        })),
      );
    });
  };

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    loadFiles();
  }, [open]);

  const deleteFile = async (path: string, label: string, index: number) => {
    if (!window.confirm(`确定删除「${label}」？此操作会永久删除磁盘上的文件，且无法撤销。`)) return;
    await deleteVaultPath(path, "file");
    setFiles((prev) => prev.filter((f) => f.path !== path));
    setSelected((s) => {
      if (index < s) return s - 1;
      if (index === s) return Math.max(0, s - 1);
      return s;
    });
  };

  const items = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = q
      ? files.filter((f) => f.title.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
      : files;
    return filtered.slice(0, 20);
  }, [files, query]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected, open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, items.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter" && items[selected]) {
        e.preventDefault();
        workspaceStore.openFile(items[selected].path);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, selected, setOpen]);

  if (!open) return null;

  return (
    <div className="boke-modal-overlay" onClick={() => setOpen(false)}>
      <div className="boke-palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Quick open…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
        />
        <div className="boke-palette-list">
          {items.map((item, i) => (
            <div
              key={item.path}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={`boke-palette-item${i === selected ? " selected" : ""}`}
              onClick={() => {
                workspaceStore.openFile(item.path);
                setOpen(false);
              }}
            >
              <div className="boke-palette-item-main">
                {item.title}
                <small>{item.path}</small>
              </div>
              <button
                type="button"
                className="boke-palette-item-delete"
                title="删除文件"
                aria-label={`删除 ${item.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteFile(item.path, item.title, i);
                }}
              >
                ×
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <div className="boke-palette-item" style={{ color: "var(--boke-text-muted)" }}>
              No results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
