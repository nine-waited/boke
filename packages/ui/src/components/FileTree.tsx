import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import type { VaultEntry } from "@boke/core";
import { fileBaseName, isExcalidraw, isHiddenPath, isMarkdown, sanitizeNoteTitle } from "@boke/core";
import { vaultService, workspaceStore, useAppStore } from "../store.js";

interface FileTreeProps {
  dir?: string;
  depth?: number;
}

interface FileTreeContextValue {
  renamingPath: string | null;
  startRename: (path: string) => void;
  openContextMenu: (event: MouseEvent, path: string) => void;
  commitRename: (path: string, title: string) => Promise<void>;
}

const FileTreeContext = createContext<FileTreeContextValue | null>(null);

function isRenamableFile(path: string): boolean {
  return isMarkdown(path) || isExcalidraw(path);
}

function FileTreeFileItem({ entry, depth }: { entry: VaultEntry; depth: number }) {
  const ctx = useContext(FileTreeContext);
  const activePath = workspaceStore.getActivePath();
  const isRenaming = ctx?.renamingPath === entry.path;
  const [draft, setDraft] = useState(() => fileBaseName(entry.path));
  const inputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  useEffect(() => {
    if (isRenaming) {
      setDraft(fileBaseName(entry.path));
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isRenaming, entry.path]);

  const cancelRename = useCallback(() => {
    ctx?.startRename("");
  }, [ctx]);

  const commit = useCallback(async () => {
    if (!ctx || committingRef.current) return;
    const trimmed = draft.trim();
    if (!trimmed || sanitizeNoteTitle(trimmed) === fileBaseName(entry.path)) {
      cancelRename();
      return;
    }

    committingRef.current = true;
    try {
      await ctx.commitRename(entry.path, trimmed);
    } finally {
      committingRef.current = false;
    }
  }, [ctx, draft, entry.path, cancelRename]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      cancelRename();
    }
  };

  const openFile = () => {
    if (isRenaming) return;
    if (entry.path.endsWith(".excalidraw")) {
      workspaceStore.openExcalidraw(entry.path);
    } else if (entry.path.endsWith(".md")) {
      workspaceStore.openFile(entry.path);
    }
  };

  const icon = entry.path.endsWith(".excalidraw") ? "📐" : entry.path.endsWith(".md") ? "📝" : "📄";

  if (isRenaming) {
    return (
      <div
        className="boke-file-tree-item boke-file-tree-item--renaming"
        style={{ paddingLeft: depth * 12 }}
      >
        <span className="boke-file-tree-icon">{icon}</span>
        <input
          ref={inputRef}
          className="boke-file-tree-rename-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={onKeyDown}
          onClick={(e) => e.stopPropagation()}
          spellCheck={false}
          aria-label="重命名文件"
        />
      </div>
    );
  }

  return (
    <div
      className={`boke-file-tree-item${activePath === entry.path ? " active" : ""}`}
      style={{ paddingLeft: depth * 12 }}
      onClick={openFile}
      onContextMenu={(e) => {
        if (!isRenamableFile(entry.path)) return;
        e.preventDefault();
        e.stopPropagation();
        ctx?.openContextMenu(e, entry.path);
      }}
    >
      <span className="boke-file-tree-icon">{icon}</span>
      <span className="boke-file-tree-name">{entry.name}</span>
    </div>
  );
}

function FileTreeNode({ dir = "", depth = 0 }: FileTreeProps) {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [expanded, setExpanded] = useState(depth < 2);
  const treeVersion = useAppStore((s) => s.treeVersion);

  useEffect(() => {
    vaultService.listTree(dir).then((list) => {
      setEntries(list.filter((e) => !isHiddenPath(e.path)));
    });
  }, [dir, treeVersion]);

  if (!expanded && depth > 0) {
    return (
      <div
        className="boke-file-tree-item boke-file-tree-dir"
        style={{ paddingLeft: depth * 12 }}
        onClick={() => setExpanded(true)}
      >
        📁 {dir.split("/").pop() || dir}
      </div>
    );
  }

  return (
    <>
      {depth > 0 && (
        <div
          className="boke-file-tree-item boke-file-tree-dir"
          style={{ paddingLeft: depth * 12 }}
          onClick={() => setExpanded(false)}
        >
          📂 {dir.split("/").pop()}
        </div>
      )}
      {expanded &&
        entries.map((entry) =>
          entry.kind === "directory" ? (
            <FileTreeNode key={entry.path} dir={entry.path} depth={depth + 1} />
          ) : (
            <FileTreeFileItem key={entry.path} entry={entry} depth={depth + 1} />
          ),
        )}
    </>
  );
}

export function FileTree() {
  const refreshTree = useAppStore((s) => s.refreshTree);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  const startRename = useCallback((path: string) => {
    setRenamingPath(path || null);
  }, []);

  const openContextMenu = useCallback((event: MouseEvent, path: string) => {
    setContextMenu({ x: event.clientX, y: event.clientY, path });
  }, []);

  const commitRename = useCallback(
    async (path: string, title: string) => {
      try {
        const newPath = await vaultService.renameFile(path, title);
        if (newPath !== path) {
          workspaceStore.renamePath(path, newPath);
          refreshTree();
        }
      } catch (err) {
        console.warn("[boke] rename failed:", err);
      } finally {
        setRenamingPath(null);
      }
    },
    [refreshTree],
  );

  const ctxValue: FileTreeContextValue = {
    renamingPath,
    startRename,
    openContextMenu,
    commitRename,
  };

  return (
    <>
      <FileTreeContext.Provider value={ctxValue}>
        <div className="boke-file-tree">
          <FileTreeNode />
        </div>
      </FileTreeContext.Provider>
      {contextMenu && (
        <div
          className="boke-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="boke-context-menu-item"
            onClick={() => {
              startRename(contextMenu.path);
              setContextMenu(null);
            }}
          >
            重命名
          </button>
        </div>
      )}
    </>
  );
}
