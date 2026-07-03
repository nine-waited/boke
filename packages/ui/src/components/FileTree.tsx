import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { VaultEntry } from "@boke/core";
import { fileBaseName, isExcalidraw, isHiddenPath, isImage, isMarkdown, sanitizeFolderName, sanitizeNoteTitle } from "@boke/core";
import {
  createAndOpenDrawing,
  createAndOpenNote,
  createFolder,
  deleteVaultPath,
} from "../note-actions.js";
import { ExcalidrawGrayIcon, FolderGrayIcon, ImageGrayIcon, MarkdownGrayIcon } from "../icons/sidebar-icons.js";
import { useFileTreeCollapseGeneration } from "../file-tree-expand-context.js";
import { useT } from "../i18n/index.js";
import { vaultService, workspaceStore, useAppStore } from "../store.js";

interface FileTreeProps {
  dir?: string;
  depth?: number;
}

type ContextTarget =
  | { kind: "root"; path: "" }
  | { kind: "folder"; path: string }
  | { kind: "file"; path: string };

interface FileTreeContextValue {
  activePath: string | null;
  renamingPath: string | null;
  startRename: (path: string) => void;
  openContextMenu: (event: MouseEvent, target: ContextTarget) => void;
  commitRename: (path: string, title: string) => Promise<void>;
}

const FileTreeContext = createContext<FileTreeContextValue | null>(null);

function isRenamableFile(path: string): boolean {
  return isMarkdown(path) || isExcalidraw(path);
}

function TreeGuides({ depth }: { depth: number }) {
  if (depth <= 0) return null;
  return (
    <div className="boke-file-tree-guides" aria-hidden="true">
      {Array.from({ length: depth }, (_, index) => (
        <span key={index} className="boke-file-tree-guide" />
      ))}
    </div>
  );
}

function TreeRow({
  depth,
  className = "",
  children,
  ...props
}: {
  depth: number;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="boke-file-tree-row" {...props}>
      <TreeGuides depth={depth} />
      <div className={`boke-file-tree-item ${className}`.trim()}>{children}</div>
    </div>
  );
}

function TreeChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <span className={`boke-file-tree-chevron${expanded ? " is-expanded" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 16 16" width="16" height="16" focusable="false">
        <path
          d="M6 4.5 10 8 6 11.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function TreeChevronSpacer() {
  return <span className="boke-file-tree-chevron-spacer" aria-hidden="true" />;
}

function FileTreeFileIcon({ path }: { path: string }) {
  if (isExcalidraw(path)) {
    return (
      <span className="boke-file-tree-icon boke-file-tree-icon--excalidraw" aria-hidden="true">
        <ExcalidrawGrayIcon />
      </span>
    );
  }
  if (isMarkdown(path)) {
    return (
      <span className="boke-file-tree-icon boke-file-tree-icon--markdown" aria-hidden="true">
        <MarkdownGrayIcon />
      </span>
    );
  }
  if (isImage(path)) {
    return (
      <span className="boke-file-tree-icon boke-file-tree-icon--image" aria-hidden="true">
        <ImageGrayIcon />
      </span>
    );
  }
  return null;
}

function FileTreeFolderRow({
  depth,
  folderPath,
  folderName,
  expanded,
  onToggle,
}: {
  depth: number;
  folderPath: string;
  folderName: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const ctx = useContext(FileTreeContext);
  const t = useT();
  const isRenaming = ctx?.renamingPath === folderPath;
  const [draft, setDraft] = useState(folderName);
  const inputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  useEffect(() => {
    if (isRenaming) {
      setDraft(folderName);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isRenaming, folderName]);

  const cancelRename = useCallback(() => {
    ctx?.startRename("");
  }, [ctx]);

  const commit = useCallback(async () => {
    if (!ctx || committingRef.current) return;
    const trimmed = draft.trim();
    if (!trimmed || sanitizeFolderName(trimmed) === folderName) {
      cancelRename();
      return;
    }

    committingRef.current = true;
    try {
      await ctx.commitRename(folderPath, trimmed);
    } finally {
      committingRef.current = false;
    }
  }, [ctx, draft, folderPath, folderName, cancelRename]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void commit();
    } else if (e.key === "Escape") {
      cancelRename();
    }
  };

  if (isRenaming) {
    return (
      <TreeRow depth={depth} className="boke-file-tree-dir boke-file-tree-item--renaming">
        <TreeChevronIcon expanded={expanded} />
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
          aria-label={t("fileTree.renameFolderAria")}
        />
      </TreeRow>
    );
  }

  return (
    <TreeRow
      depth={depth}
      className="boke-file-tree-dir"
      onClick={onToggle}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        ctx?.openContextMenu(e, { kind: "folder", path: folderPath });
      }}
    >
      <TreeChevronIcon expanded={expanded} />
      <span className="boke-file-tree-icon boke-file-tree-icon--folder" aria-hidden="true">
        <FolderGrayIcon />
      </span>
      <span className="boke-file-tree-name">{folderName}</span>
    </TreeRow>
  );
}

function FileTreeFileItem({ entry, depth }: { entry: VaultEntry; depth: number }) {
  const ctx = useContext(FileTreeContext);
  const t = useT();
  const activePath = ctx?.activePath ?? null;
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
    } else if (isImage(entry.path)) {
      workspaceStore.openImage(entry.path);
    } else if (entry.path.endsWith(".md")) {
      workspaceStore.openFile(entry.path);
    }
  };

  if (isRenaming) {
    return (
      <TreeRow depth={depth} className="boke-file-tree-file boke-file-tree-item--renaming">
        <TreeChevronSpacer />
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
          aria-label={t("fileTree.renameFileAria")}
        />
      </TreeRow>
    );
  }

  return (
    <TreeRow
      depth={depth}
      className={`boke-file-tree-file${activePath === entry.path ? " active" : ""}`}
      onClick={openFile}
      onContextMenu={(e) => {
        if (!isRenamableFile(entry.path)) return;
        e.preventDefault();
        e.stopPropagation();
        ctx?.openContextMenu(e, { kind: "file", path: entry.path });
      }}
    >
      <TreeChevronSpacer />
      <FileTreeFileIcon path={entry.path} />
      <span className="boke-file-tree-name">{entry.name}</span>
    </TreeRow>
  );
}

function FileTreeNode({ dir = "", depth = 0 }: FileTreeProps) {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [expanded, setExpanded] = useState(!dir);
  const collapseGeneration = useFileTreeCollapseGeneration();
  const treeVersion = useAppStore((s) => s.treeVersion);
  const folderName = dir.split("/").pop() || dir;

  useEffect(() => {
    if (!dir || collapseGeneration === 0) return;
    setExpanded(false);
  }, [collapseGeneration, dir]);

  useEffect(() => {
    vaultService.listTree(dir).then((list) => {
      setEntries(list.filter((e) => !isHiddenPath(e.path)));
    });
  }, [dir, treeVersion]);

  if (!expanded && dir) {
    return (
      <FileTreeFolderRow
        depth={depth}
        folderPath={dir}
        folderName={folderName}
        expanded={false}
        onToggle={() => setExpanded(true)}
      />
    );
  }

  return (
    <>
      {dir && (
        <FileTreeFolderRow
          depth={depth}
          folderPath={dir}
          folderName={folderName}
          expanded={expanded}
          onToggle={() => setExpanded(false)}
        />
      )}
      {expanded &&
        entries.map((entry) => {
          const itemDepth = dir ? depth + 1 : depth;
          return entry.kind === "directory" ? (
            <FileTreeNode key={entry.path} dir={entry.path} depth={itemDepth} />
          ) : (
            <FileTreeFileItem key={entry.path} entry={entry} depth={itemDepth} />
          );
        })}
    </>
  );
}

function FileTreeContextMenu({
  target,
  onClose,
  onRename,
}: {
  target: ContextTarget;
  onClose: () => void;
  onRename: (path: string) => void;
}) {
  const t = useT();
  const parentDir = target.kind === "root" ? "" : target.kind === "folder" ? target.path : "";

  const run = (action: () => void | Promise<unknown>) => {
    onClose();
    void action();
  };

  const confirmDelete = (label: string, action: () => Promise<void>) => {
    if (!window.confirm(t("fileTree.deleteConfirm", { name: label }))) return;
    onClose();
    void action();
  };

  if (target.kind === "file") {
    const name = target.path.split("/").pop() ?? target.path;
    return (
      <>
        <button
          type="button"
          className="boke-context-menu-item"
          onClick={() => run(() => onRename(target.path))}
        >
          {t("fileTree.rename")}
        </button>
        <button
          type="button"
          className="boke-context-menu-item boke-context-menu-item--danger"
          onClick={() => confirmDelete(name, () => deleteVaultPath(target.path, "file"))}
        >
          {t("fileTree.delete")}
        </button>
      </>
    );
  }

  const folderLabel =
    target.kind === "root" ? t("fileTree.currentFolder") : (target.path.split("/").pop() ?? target.path);

  return (
    <>
      <button
        type="button"
        className="boke-context-menu-item"
        onClick={() => run(() => createAndOpenNote(parentDir))}
      >
        {t("fileTree.newNote")}
      </button>
      <button
        type="button"
        className="boke-context-menu-item"
        onClick={() => run(() => createAndOpenDrawing(parentDir))}
      >
        {t("fileTree.newDrawing")}
      </button>
      <button
        type="button"
        className="boke-context-menu-item"
        onClick={() => run(() => createFolder(parentDir))}
      >
        {t("fileTree.newFolder")}
      </button>
      {target.kind === "folder" && (
        <>
          <button
            type="button"
            className="boke-context-menu-item"
            onClick={() => run(() => onRename(target.path))}
          >
            {t("fileTree.rename")}
          </button>
          <button
            type="button"
            className="boke-context-menu-item boke-context-menu-item--danger"
            onClick={() => confirmDelete(folderLabel, () => deleteVaultPath(target.path, "directory"))}
          >
            {t("fileTree.deleteFolder")}
          </button>
        </>
      )}
    </>
  );
}

export function FileTree() {
  const refreshTree = useAppStore((s) => s.refreshTree);
  const activePath = useSyncExternalStore(
    (cb) => workspaceStore.subscribe(cb),
    () => workspaceStore.getActivePath(),
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: ContextTarget;
  } | null>(null);
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

  const openContextMenu = useCallback((event: MouseEvent, target: ContextTarget) => {
    setContextMenu({ x: event.clientX, y: event.clientY, target });
  }, []);

  const commitRename = useCallback(
    async (path: string, title: string) => {
      try {
        const isFolder = !isMarkdown(path) && !isExcalidraw(path);
        const newPath = isFolder
          ? await vaultService.renameFolder(path, title)
          : await vaultService.renameFile(path, title);
        if (newPath !== path) {
          if (isFolder) {
            workspaceStore.renamePathPrefix(path, newPath);
          } else {
            workspaceStore.renamePath(path, newPath);
          }
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
    activePath,
    renamingPath,
    startRename,
    openContextMenu,
    commitRename,
  };

  return (
    <>
      <FileTreeContext.Provider value={ctxValue}>
        <div
          className="boke-file-tree"
          onContextMenu={(e) => {
            if (e.target !== e.currentTarget) return;
            e.preventDefault();
            openContextMenu(e, { kind: "root", path: "" });
          }}
        >
          <FileTreeNode />
        </div>
      </FileTreeContext.Provider>
      {contextMenu && (
        <div
          className="boke-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <FileTreeContextMenu
            target={contextMenu.target}
            onClose={() => setContextMenu(null)}
            onRename={startRename}
          />
        </div>
      )}
    </>
  );
}
