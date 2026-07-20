import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type PointerEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import type { VaultEntry } from "@chestnut/core";
import { fileBaseName, isExcalidraw, isExportTargetFolder, isImage, isInExportTargetFolder, isInNotePicFolder, isMarkdown, isNotePicFolder, isPdf, sanitizeFolderName, sanitizeNoteTitle, sortFileTreeEntries } from "@chestnut/core";
import {
  createAndOpenDrawing,
  createAndOpenNote,
  createFolder,
  confirmAndDeleteVaultPath,
  copyVaultEntryFile,
  copyVaultEntryFiles,
  copyVaultEntryPath,
  exportNoteToPdf,
  exportNoteToMarkdown,
  revealInFileManager,
} from "../note-actions.js";
import { ExcalidrawGrayIcon, FolderGrayIcon, FolderLockIcon, ImageGrayIcon, MarkdownGrayIcon, PdfGrayIcon } from "../icons/sidebar-icons.js";
import { useFileTreeReveal, revealFileInTreeWhenReady } from "../file-tree-expand-context.js";
import { fileTreeSelection, collectVisibleFileTreeItems, type FileTreeSelectionKind } from "../file-tree-selection.js";
import { fileTreeExpanded } from "../file-tree-expanded.js";
import { fileTreeRename } from "../file-tree-rename.js";
import { isFileTreeEntryVisible } from "../file-tree-visibility.js";
import {
  canDragFileTreeEntry,
  canDropFileTreeEntry,
  type FileTreeDragKind,
  type FileTreeDragPayload,
} from "../file-tree-move.js";
import {
  attachFileTreeDragGhost,
  detachFileTreeDragGhost,
  moveFileTreeDragGhost,
} from "../file-tree-drag-ghost.js";
import {
  createPointerDragSession,
  FILE_TREE_DRAG_LONG_PRESS_MS,
  findDropFolderAt,
  pointerDragMovedEnough,
  type FileTreePointerDragSession,
} from "../file-tree-pointer-dnd.js";
import { useT } from "../i18n/index.js";
import { isTauri } from "@chestnut/storage-adapters";
import { vaultService, workspaceStore, useAppStore } from "../store.js";
import { ContextMenuFrame } from "./ContextMenuFrame.js";

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
  selectionRevision: number;
  contextMenuPath: string | null;
  renamingPath: string | null;
  dragging: FileTreeDragPayload | null;
  dropTarget: string | null;
  expandFolderRequest: string | null;
  consumeClickAfterDrag: () => boolean;
  isSelected: (path: string) => boolean;
  hasSelection: () => boolean;
  selectExclusive: (path: string, kind: FileTreeSelectionKind) => void;
  toggleSelect: (path: string, kind: FileTreeSelectionKind) => void;
  selectRangeTo: (path: string, kind: FileTreeSelectionKind) => void;
  focusTree: () => void;
  startRename: (path: string) => void;
  openContextMenu: (event: MouseEvent, target: ContextTarget) => void;
  commitRename: (path: string, title: string) => Promise<void>;
  handlePointerDown: (event: PointerEvent, path: string, kind: FileTreeDragKind) => void;
}

const FileTreeContext = createContext<FileTreeContextValue | null>(null);

const FILE_TREE_SINGLE_CLICK_MS = 280;

function useDeferredSingleClick(onSingle: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingClick = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleSingleClick = useCallback(() => {
    cancelPendingClick();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onSingle();
    }, FILE_TREE_SINGLE_CLICK_MS);
  }, [cancelPendingClick, onSingle]);

  useEffect(() => () => cancelPendingClick(), [cancelPendingClick]);

  return { scheduleSingleClick, cancelPendingClick };
}

function isRenamableFile(path: string): boolean {
  return isMarkdown(path) || isExcalidraw(path);
}

function canRenameFolder(folderPath: string): boolean {
  return !isNotePicFolder(folderPath) && !isInExportTargetFolder(folderPath);
}

function fileTreeItemClassName(
  base: string,
  path: string,
  kind: FileTreeDragKind,
  ctx: FileTreeContextValue | null,
): string {
  const classes = [base];
  if (ctx?.dragging?.path === path && ctx.dragging.kind === kind) {
    classes.push("boke-file-tree-item--dragging");
  }
  if (kind === "directory" && ctx?.dropTarget === path) {
    classes.push("boke-file-tree-item--drop-target");
  }
  return classes.join(" ");
}

function isPathInsideDir(dir: string, path: string): boolean {
  if (!dir) return true;
  return path === dir || path.startsWith(`${dir}/`);
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
  ref,
  dropPath,
  parentDir,
  path,
  kind,
  interactionProps,
}: {
  depth: number;
  className?: string;
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
  dropPath?: string;
  parentDir?: string;
  path?: string;
  kind?: FileTreeSelectionKind;
  interactionProps?: HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div ref={ref} className="boke-file-tree-row">
      <TreeGuides depth={depth} />
      <div
        className={`boke-file-tree-item ${className}`.trim()}
        data-file-tree-drop={dropPath}
        data-file-tree-parent={parentDir}
        data-file-tree-path={path}
        data-file-tree-kind={kind}
        {...interactionProps}
      >
        {children}
      </div>
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

function TreeChevronToggle({
  expanded,
  onToggle,
  expandLabel,
  collapseLabel,
}: {
  expanded: boolean;
  onToggle: () => void;
  expandLabel: string;
  collapseLabel: string;
}) {
  return (
    <button
      type="button"
      className="boke-file-tree-chevron-toggle"
      aria-label={expanded ? collapseLabel : expandLabel}
      aria-expanded={expanded}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <TreeChevronIcon expanded={expanded} />
    </button>
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
  if (isPdf(path)) {
    return (
      <span className="boke-file-tree-icon boke-file-tree-icon--pdf" aria-hidden="true">
        <PdfGrayIcon />
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
  const { revealGeneration, revealTargetPath } = useFileTreeReveal();
  const isPicFolder = isNotePicFolder(folderPath);
  const isExportFolder = isExportTargetFolder(folderPath);
  const isContextTarget = ctx?.contextMenuPath === folderPath;
  const isActive = Boolean(ctx?.isSelected(folderPath)) && !isContextTarget;
  const isRenaming = ctx?.renamingPath === folderPath;
  const draggable = !isRenaming && !isPicFolder && !isExportFolder && canDragFileTreeEntry(folderPath, "directory");
  const [draft, setDraft] = useState(folderName);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const committingRef = useRef(false);

  useEffect(() => {
    if (!revealTargetPath || revealGeneration === 0 || !folderPath) return;
    if (revealTargetPath === folderPath || revealTargetPath.startsWith(`${folderPath}/`)) {
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [revealGeneration, revealTargetPath, folderPath]);

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

  const canRename = canRenameFolder(folderPath);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (ctx?.consumeClickAfterDrag()) return;
      if (event.shiftKey) {
        event.preventDefault();
        ctx?.selectRangeTo(folderPath, "directory");
        ctx?.focusTree();
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        ctx?.toggleSelect(folderPath, "directory");
        ctx?.focusTree();
        return;
      }
      ctx?.selectExclusive(folderPath, "directory");
      ctx?.focusTree();
    },
    [ctx, folderPath],
  );

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!canRename) return;
    e.preventDefault();
    e.stopPropagation();
    if (ctx?.consumeClickAfterDrag()) return;
    ctx?.startRename(folderPath);
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
      ref={rowRef}
      depth={depth}
      path={folderPath}
      kind="directory"
      className={fileTreeItemClassName(
        `boke-file-tree-dir${isActive ? " active" : ""}${isContextTarget ? " context-target" : ""}${draggable ? " boke-file-tree-item--draggable" : ""}`,
        folderPath,
        "directory",
        ctx,
      )}
      dropPath={folderPath}
      interactionProps={{
        onPointerDown: draggable
          ? (event) => ctx?.handlePointerDown(event, folderPath, "directory")
          : undefined,
        onClick: handleClick,
        onDoubleClick: handleDoubleClick,
        onContextMenu: (e) => {
          e.preventDefault();
          e.stopPropagation();
          ctx?.openContextMenu(e, { kind: "folder", path: folderPath });
        },
      }}
    >
      <TreeChevronToggle
        expanded={expanded}
        onToggle={onToggle}
        expandLabel={t("fileTree.expandFolder")}
        collapseLabel={t("fileTree.collapseFolder")}
      />
      <span className="boke-file-tree-icon boke-file-tree-icon--folder" aria-hidden="true">
        <FolderGrayIcon />
      </span>
      <span className="boke-file-tree-name-row">
        <span className="boke-file-tree-name">{folderName}</span>
        {isPicFolder && (
          <span className="boke-file-tree-lock" title={t("fileTree.picFolderLocked")} aria-hidden="true">
            <FolderLockIcon />
          </span>
        )}
        {isExportFolder && (
          <span className="boke-file-tree-lock" title={t("fileTree.exportTargetFolderLocked")} aria-hidden="true">
            <FolderLockIcon />
          </span>
        )}
      </span>
    </TreeRow>
  );
}

function FileTreeFileItem({ entry, depth }: { entry: VaultEntry; depth: number }) {
  const ctx = useContext(FileTreeContext);
  const t = useT();
  const { revealGeneration, revealTargetPath } = useFileTreeReveal();
  const activePath = ctx?.activePath ?? null;
  const isContextTarget = ctx?.contextMenuPath === entry.path;
  const selected = Boolean(ctx?.isSelected(entry.path));
  const isActive =
    !isContextTarget &&
    (selected || (!ctx?.hasSelection() && activePath === entry.path));
  const isRenaming = ctx?.renamingPath === entry.path;
  const [draft, setDraft] = useState(() => fileBaseName(entry.path));
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!revealTargetPath || revealGeneration === 0) return;
    if (entry.path !== revealTargetPath) return;
    rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [revealGeneration, revealTargetPath, entry.path]);

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
    } else if (isPdf(entry.path)) {
      workspaceStore.openPdf(entry.path);
    } else if (entry.path.endsWith(".md")) {
      workspaceStore.openFile(entry.path);
    }
  };

  const draggable = !isRenaming && canDragFileTreeEntry(entry.path, "file");
  const parentDir = entry.path.includes("/") ? entry.path.slice(0, entry.path.lastIndexOf("/")) : "";
  const canRename = isRenamableFile(entry.path);

  const handleDeferredOpen = useCallback(() => {
    if (ctx?.consumeClickAfterDrag()) return;
    openFile();
  }, [ctx, openFile]);

  const { scheduleSingleClick, cancelPendingClick } = useDeferredSingleClick(handleDeferredOpen);

  const handleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (ctx?.consumeClickAfterDrag()) return;
      if (event.shiftKey) {
        event.preventDefault();
        cancelPendingClick();
        ctx?.selectRangeTo(entry.path, "file");
        ctx?.focusTree();
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        cancelPendingClick();
        ctx?.toggleSelect(entry.path, "file");
        ctx?.focusTree();
        return;
      }
      ctx?.selectExclusive(entry.path, "file");
      ctx?.focusTree();
      if (canRename) scheduleSingleClick();
      else openFile();
    },
    [ctx, entry.path, canRename, scheduleSingleClick, openFile, cancelPendingClick],
  );

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!canRename) return;
    e.preventDefault();
    e.stopPropagation();
    cancelPendingClick();
    if (ctx?.consumeClickAfterDrag()) return;
    ctx?.startRename(entry.path);
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
      ref={rowRef}
      depth={depth}
      path={entry.path}
      kind="file"
      className={fileTreeItemClassName(
        `boke-file-tree-file${isActive ? " active" : ""}${isContextTarget ? " context-target" : ""}${draggable ? " boke-file-tree-item--draggable" : ""}`,
        entry.path,
        "file",
        ctx,
      )}
      parentDir={parentDir}
      interactionProps={{
        onPointerDown: draggable
          ? (event) => ctx?.handlePointerDown(event, entry.path, "file")
          : undefined,
        onClick: handleClick,
        onDoubleClick: handleDoubleClick,
        onContextMenu: (e) => {
          e.preventDefault();
          e.stopPropagation();
          ctx?.openContextMenu(e, { kind: "file", path: entry.path });
        },
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
  const expanded = useSyncExternalStore(
    (cb) => fileTreeExpanded.subscribe(cb),
    () => (dir ? fileTreeExpanded.isExpanded(dir) : true),
  );
  const { revealGeneration, revealTargetPath } = useFileTreeReveal();
  const treeVersion = useAppStore((s) => s.treeVersion);
  const showNotePicFolders = useAppStore((s) => s.showNotePicFolders);
  const folderName = dir.split("/").pop() || dir;

  useEffect(() => {
    if (!revealTargetPath || revealGeneration === 0) return;
    if (isPathInsideDir(dir, revealTargetPath)) {
      fileTreeExpanded.setExpanded(dir, true);
    }
  }, [revealGeneration, revealTargetPath, dir]);

  const treeCtx = useContext(FileTreeContext);
  useEffect(() => {
    if (!treeCtx?.expandFolderRequest || !dir) return;
    const request = treeCtx.expandFolderRequest;
    if (request === dir || request.startsWith(`${dir}/`)) {
      fileTreeExpanded.setExpanded(dir, true);
    }
  }, [treeCtx?.expandFolderRequest, dir]);

  useEffect(() => {
    vaultService.listTree(dir).then((list) => {
      const visible = list.filter((e) => isFileTreeEntryVisible(e, showNotePicFolders));
      setEntries(sortFileTreeEntries(visible, dir));
    });
  }, [dir, treeVersion, showNotePicFolders]);

  if (!expanded && dir) {
    return (
      <FileTreeFolderRow
        depth={depth}
        folderPath={dir}
        folderName={folderName}
        expanded={false}
        onToggle={() => fileTreeExpanded.setExpanded(dir, true)}
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
          onToggle={() => fileTreeExpanded.setExpanded(dir, false)}
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

function FileTreeContextMenuRevealItem({
  path,
  onRun,
}: {
  path: string;
  onRun: (action: () => void | Promise<unknown>) => void;
}) {
  const t = useT();
  const desktopOnly = !isTauri();

  return (
    <button
      type="button"
      className={`boke-context-menu-item${desktopOnly ? " boke-context-menu-item--disabled" : ""}`}
      onClick={() => {
        if (desktopOnly) return;
        onRun(() => revealInFileManager(path));
      }}
    >
      {t("fileTree.revealInFileManager")}
    </button>
  );
}

function FileTreeContextMenuCopyFileItem({
  path,
  onRun,
}: {
  path: string;
  onRun: (action: () => void | Promise<unknown>) => void;
}) {
  const t = useT();
  const desktopOnly = !isTauri();

  return (
    <button
      type="button"
      className={`boke-context-menu-item${desktopOnly ? " boke-context-menu-item--disabled" : ""}`}
      onClick={() => {
        if (desktopOnly) return;
        onRun(() => copyVaultEntryFile(path));
      }}
    >
      {t("fileTree.copyFile")}
    </button>
  );
}

function FileTreeContextMenuExportPdfItem({
  path,
  onRun,
}: {
  path: string;
  onRun: (action: () => void | Promise<unknown>) => void;
}) {
  const t = useT();
  const setStatusText = useAppStore((s) => s.setStatusText);
  const desktopOnly = !isTauri();

  return (
    <button
      type="button"
      className={`boke-context-menu-item${desktopOnly ? " boke-context-menu-item--disabled" : ""}`}
      onClick={() => {
        if (desktopOnly) return;
        onRun(async () => {
          try {
            await exportNoteToPdf(path);
          } catch (err) {
            console.error("[Chestnut] export pdf failed:", err);
            setStatusText(t("status.exportPdfFailed"));
          }
        });
      }}
    >
      {t("fileTree.exportPdf")}
    </button>
  );
}

function FileTreeContextMenuExportMarkdownItem({
  path,
  onRun,
}: {
  path: string;
  onRun: (action: () => void | Promise<unknown>) => void;
}) {
  const t = useT();
  const setStatusText = useAppStore((s) => s.setStatusText);
  const desktopOnly = !isTauri();

  return (
    <button
      type="button"
      className={`boke-context-menu-item${desktopOnly ? " boke-context-menu-item--disabled" : ""}`}
      onClick={() => {
        if (desktopOnly) return;
        onRun(async () => {
          try {
            await exportNoteToMarkdown(path);
          } catch (err) {
            console.error("[Chestnut] export markdown failed:", err);
            setStatusText(t("status.exportMarkdownFailed"));
          }
        });
      }}
    >
      {t("fileTree.exportMarkdown")}
    </button>
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

  const confirmDelete = (label: string, path: string, kind: "file" | "directory") => {
    onClose();
    void confirmAndDeleteVaultPath(path, kind, label);
  };

  if (target.kind === "file") {
    const name = target.path.split("/").pop() ?? target.path;
    const canRename = isRenamableFile(target.path);
    return (
      <>
        {canRename && (
          <button
            type="button"
            className="boke-context-menu-item"
            onClick={() => run(() => onRename(target.path))}
          >
            {t("fileTree.rename")}
          </button>
        )}
        <FileTreeContextMenuCopyFileItem path={target.path} onRun={run} />
        <button
          type="button"
          className="boke-context-menu-item"
          onClick={() => run(() => copyVaultEntryPath(target.path))}
        >
          {t("fileTree.copyPath")}
        </button>
        <FileTreeContextMenuRevealItem path={target.path} onRun={run} />
        {isMarkdown(target.path) && (
          <>
            <FileTreeContextMenuExportMarkdownItem path={target.path} onRun={run} />
            <FileTreeContextMenuExportPdfItem path={target.path} onRun={run} />
          </>
        )}
        <button
          type="button"
          className="boke-context-menu-item boke-context-menu-item--danger"
          onClick={() => confirmDelete(name, target.path, "file")}
        >
          {t("fileTree.delete")}
        </button>
      </>
    );
  }

  const folderLabel =
    target.kind === "root" ? t("fileTree.currentFolder") : (target.path.split("/").pop() ?? target.path);
  const isPicFolder = target.kind === "folder" && isNotePicFolder(target.path);
  const cannotCreateHere = isInNotePicFolder(parentDir) || isInExportTargetFolder(parentDir);
  const cannotRenameFolder =
    target.kind === "folder" && (isPicFolder || isInExportTargetFolder(target.path));

  return (
    <>
      <button
        type="button"
        className={`boke-context-menu-item${cannotCreateHere ? " boke-context-menu-item--disabled" : ""}`}
        onClick={() => {
          if (cannotCreateHere) return;
          run(() => createAndOpenNote(parentDir));
        }}
      >
        {t("fileTree.newNote")}
      </button>
      <button
        type="button"
        className={`boke-context-menu-item${cannotCreateHere ? " boke-context-menu-item--disabled" : ""}`}
        onClick={() => {
          if (cannotCreateHere) return;
          run(() => createAndOpenDrawing(parentDir));
        }}
      >
        {t("fileTree.newDrawing")}
      </button>
      <button
        type="button"
        className={`boke-context-menu-item${cannotCreateHere ? " boke-context-menu-item--disabled" : ""}`}
        onClick={() => {
          if (cannotCreateHere) return;
          run(() => createFolder(parentDir));
        }}
      >
        {t("fileTree.newFolder")}
      </button>
      <FileTreeContextMenuRevealItem
        path={target.kind === "root" ? "" : target.path}
        onRun={run}
      />
      {target.kind === "folder" && (
        <>
          <button
            type="button"
            className={`boke-context-menu-item${cannotRenameFolder ? " boke-context-menu-item--disabled" : ""}`}
            onClick={() => {
              if (cannotRenameFolder) return;
              run(() => onRename(target.path));
            }}
          >
            {t("fileTree.rename")}
          </button>
          <button
            type="button"
            className="boke-context-menu-item boke-context-menu-item--danger"
            onClick={() => confirmDelete(folderLabel, target.path, "directory")}
          >
            {t("fileTree.deleteFolder")}
          </button>
        </>
      )}
    </>
  );
}

export function FileTree() {
  const t = useT();
  const refreshTree = useAppStore((s) => s.refreshTree);
  const setStatusText = useAppStore((s) => s.setStatusText);
  const activePath = useSyncExternalStore(
    (cb) => workspaceStore.subscribe(cb),
    () => workspaceStore.getActivePath(),
  );
  const selectionRevision = useSyncExternalStore(
    (cb) => fileTreeSelection.subscribe(cb),
    () => fileTreeSelection.getRevision(),
  );
  const treeRootRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: ContextTarget;
  } | null>(null);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [dragging, setDragging] = useState<FileTreeDragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [expandFolderRequest, setExpandFolderRequest] = useState<string | null>(null);
  const draggingRef = useRef<FileTreeDragPayload | null>(null);
  const pointerSessionRef = useRef<FileTreePointerDragSession | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

  const endPointerDrag = useCallback(() => {
    pointerSessionRef.current = null;
    draggingRef.current = null;
    setDragging(null);
    setDropTarget(null);
    setExpandFolderRequest(null);
    detachFileTreeDragGhost();
    document.body.classList.remove("boke-file-tree-dragging");
  }, []);

  const beginPointerDrag = useCallback((session: FileTreePointerDragSession, clientX: number, clientY: number) => {
    session.active = true;
    session.didDrag = true;
    draggingRef.current = session.payload;
    setDragging(session.payload);
    setDropTarget(null);
    attachFileTreeDragGhost(session.sourceElement, clientX, clientY);
    document.body.classList.add("boke-file-tree-dragging");
  }, []);

  const updateDropTargetAt = useCallback((clientX: number, clientY: number, payload: FileTreeDragPayload) => {
    const folderPath = findDropFolderAt(clientX, clientY);
    if (folderPath === null) {
      setDropTarget(null);
      return;
    }
    if (!canDropFileTreeEntry(payload.path, payload.kind, folderPath)) {
      setDropTarget(null);
      return;
    }
    setDropTarget(folderPath);
    if (folderPath) {
      setExpandFolderRequest(folderPath);
    }
  }, []);

  const consumeClickAfterDrag = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

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
    if (path && (isNotePicFolder(path) || isInExportTargetFolder(path))) return;
    setRenamingPath(path || null);
  }, []);

  useEffect(() => {
    const applyPendingRename = () => {
      const path = fileTreeRename.consumePendingRename();
      if (path) startRename(path);
    };
    applyPendingRename();
    return fileTreeRename.subscribe(applyPendingRename);
  }, [startRename]);

  const focusTree = useCallback(() => {
    treeRootRef.current?.focus({ preventScroll: true });
  }, []);

  const openContextMenu = useCallback((event: MouseEvent, target: ContextTarget) => {
    if (target.kind === "folder") {
      fileTreeSelection.selectForContextMenu(target.path, "directory");
    } else if (target.kind === "file") {
      fileTreeSelection.selectForContextMenu(target.path, "file");
    }
    focusTree();
    setContextMenu({ x: event.clientX, y: event.clientY, target });
  }, [focusTree]);

  const selectRangeTo = useCallback((path: string, kind: FileTreeSelectionKind) => {
    const root = treeRootRef.current;
    const visible = root ? collectVisibleFileTreeItems(root) : [{ path, kind }];
    fileTreeSelection.selectRange(visible, path, kind);
  }, []);

  useEffect(() => {
    const root = treeRootRef.current;
    if (!root) return;

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "c") return;
      if (renamingPath) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      if (active instanceof HTMLElement && active.isContentEditable) return;

      const files = fileTreeSelection
        .getSelectedEntries()
        .filter((entry) => entry.kind === "file")
        .map((entry) => entry.path);
      if (files.length === 0) return;

      event.preventDefault();
      event.stopPropagation();
      void copyVaultEntryFiles(files);
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [renamingPath]);

  const commitRename = useCallback(
    async (path: string, title: string) => {
      if (isNotePicFolder(path) || isInExportTargetFolder(path)) {
        setRenamingPath(null);
        return;
      }
      try {
        const isFolder = !isMarkdown(path) && !isExcalidraw(path);
        const newPath = isFolder
          ? await vaultService.renameFolder(path, title)
          : await vaultService.renameFile(path, title);
        if (newPath !== path) {
          if (isFolder) {
            workspaceStore.renamePathPrefix(path, newPath);
            fileTreeSelection.remapVaultPathPrefix(path, newPath);
            fileTreeExpanded.remapVaultPathPrefix(path, newPath);
          } else {
            workspaceStore.renamePath(path, newPath);
            fileTreeSelection.remapVaultPath(path, newPath);
          }
          refreshTree();
        }
      } catch (err) {
        console.warn("[Chestnut] rename failed:", err);
      } finally {
        setRenamingPath(null);
      }
    },
    [refreshTree],
  );

  const performMove = useCallback(
    async (payload: FileTreeDragPayload, targetDir: string) => {
      if (!canDropFileTreeEntry(payload.path, payload.kind, targetDir)) return;
      try {
        const newPath = await vaultService.moveEntry(payload.path, payload.kind, targetDir);
        if (payload.kind === "directory") {
          workspaceStore.renamePathPrefix(payload.path, newPath);
          fileTreeSelection.remapVaultPathPrefix(payload.path, newPath);
          fileTreeExpanded.remapVaultPathPrefix(payload.path, newPath);
        } else {
          workspaceStore.renamePath(payload.path, newPath);
          fileTreeSelection.remapVaultPath(payload.path, newPath);
        }
        refreshTree();
        await revealFileInTreeWhenReady(newPath);
      } catch (err) {
        console.warn("[Chestnut] move failed:", err);
        setStatusText(t("fileTree.moveFailed"));
      }
    },
    [refreshTree, setStatusText, t],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent, path: string, kind: FileTreeDragKind) => {
      if (event.button !== 0 || !canDragFileTreeEntry(path, kind)) return;
      if (pointerSessionRef.current) return;

      const session = createPointerDragSession(
        { path, kind },
        event.pointerId,
        event.clientX,
        event.clientY,
        event.currentTarget as HTMLElement,
      );
      pointerSessionRef.current = session;

      session.longPressTimer = setTimeout(() => {
        if (pointerSessionRef.current !== session || session.active) return;
        beginPointerDrag(session, session.lastClientX, session.lastClientY);
        updateDropTargetAt(session.lastClientX, session.lastClientY, session.payload);
      }, FILE_TREE_DRAG_LONG_PRESS_MS);

      const finish = (ev: globalThis.PointerEvent) => {
        if (ev.pointerId !== session.pointerId) return;
        if (session.longPressTimer) {
          clearTimeout(session.longPressTimer);
          session.longPressTimer = null;
        }
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", finish);
        document.removeEventListener("pointercancel", finish);

        if (session.active) {
          suppressClickRef.current = true;
          const targetDir = findDropFolderAt(ev.clientX, ev.clientY);
          const payload = session.payload;
          endPointerDrag();
          if (targetDir !== null && canDropFileTreeEntry(payload.path, payload.kind, targetDir)) {
            void performMove(payload, targetDir);
          }
        } else {
          pointerSessionRef.current = null;
        }
      };

      const onMove = (ev: globalThis.PointerEvent) => {
        if (ev.pointerId !== session.pointerId) return;
        session.lastClientX = ev.clientX;
        session.lastClientY = ev.clientY;
        if (!session.active && pointerDragMovedEnough(session, ev.clientX, ev.clientY)) {
          if (session.longPressTimer) {
            clearTimeout(session.longPressTimer);
            session.longPressTimer = null;
          }
          beginPointerDrag(session, ev.clientX, ev.clientY);
        }
        if (session.active) {
          ev.preventDefault();
          moveFileTreeDragGhost(ev.clientX, ev.clientY);
          updateDropTargetAt(ev.clientX, ev.clientY, session.payload);
        }
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", finish);
      document.addEventListener("pointercancel", finish);
    },
    [beginPointerDrag, endPointerDrag, performMove, updateDropTargetAt],
  );

  const contextMenuPath =
    contextMenu && contextMenu.target.kind !== "root" ? contextMenu.target.path : null;

  const ctxValue: FileTreeContextValue = {
    activePath,
    selectionRevision,
    contextMenuPath,
    renamingPath,
    dragging,
    dropTarget,
    expandFolderRequest,
    consumeClickAfterDrag,
    isSelected: (path) => fileTreeSelection.isSelected(path),
    hasSelection: () => fileTreeSelection.hasSelection(),
    selectExclusive: (path, kind) => fileTreeSelection.selectExclusive(path, kind),
    toggleSelect: (path, kind) => fileTreeSelection.togglePath(path, kind),
    selectRangeTo,
    focusTree,
    startRename,
    openContextMenu,
    commitRename,
    handlePointerDown,
  };

  return (
    <>
      <FileTreeContext.Provider value={ctxValue}>
        <div
          ref={treeRootRef}
          className={`boke-file-tree${dropTarget === "" ? " boke-file-tree--drop-root" : ""}`}
          tabIndex={0}
          {...{ "data-file-tree-drop": "" }}
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
        <ContextMenuFrame
          x={contextMenu.x}
          y={contextMenu.y}
        >
          <FileTreeContextMenu
            target={contextMenu.target}
            onClose={() => setContextMenu(null)}
            onRename={startRename}
          />
        </ContextMenuFrame>
      )}
    </>
  );
}
