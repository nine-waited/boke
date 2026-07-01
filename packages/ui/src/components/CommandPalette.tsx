import { useEffect, useMemo, useState } from "react";
import { commandRegistry, vaultService, workspaceStore, useAppStore } from "../store.js";

export function CommandPalette() {
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [files, setFiles] = useState<Array<{ path: string; title: string }>>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    vaultService.listMarkdown().then((list) => {
      setFiles(
        list.map((f) => ({
          path: f.path,
          title: f.path.split("/").pop()?.replace(/\.md$/, "") ?? f.path,
        })),
      );
    });
  }, [open]);

  const commands = useMemo(() => commandRegistry.list(), [open, query]);
  const filteredFiles = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return files.slice(0, 20);
    return files.filter((f) => f.title.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)).slice(0, 20);
  }, [files, query]);

  const filteredCommands = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [commands, query]);

  const items = useMemo(
    () => [
      ...filteredFiles.map((f) => ({ type: "file" as const, id: f.path, label: f.title, sub: f.path })),
      ...filteredCommands.map((c) => ({ type: "command" as const, id: c.id, label: c.name, sub: c.category })),
    ],
    [filteredFiles, filteredCommands],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setOpen(!open);
      }
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
        const item = items[selected];
        if (item.type === "file") workspaceStore.openFile(item.id);
        else commandRegistry.run(item.id);
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
          placeholder="Quick open (files & commands)…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
        />
        <div className="boke-palette-list">
          {items.map((item, i) => (
            <div
              key={`${item.type}-${item.id}`}
              className={`boke-palette-item${i === selected ? " selected" : ""}`}
              onClick={() => {
                if (item.type === "file") workspaceStore.openFile(item.id);
                else commandRegistry.run(item.id);
                setOpen(false);
              }}
            >
              {item.label}
              {item.sub && <small>{item.sub}</small>}
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
