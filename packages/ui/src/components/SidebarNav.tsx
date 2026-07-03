import type { ReactNode } from "react";
import { CollapseAllFoldersIcon, ExcalidrawGrayIcon, FolderPlusIcon, NoteEditIcon } from "../icons/sidebar-icons.js";
import { useFileTreeExpand } from "../file-tree-expand-context.js";
import { useT } from "../i18n/index.js";
import { createAndOpenDrawing, createAndOpenNote, createFolder } from "../note-actions.js";

function SidebarNavButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`boke-sidebar-nav-btn ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      data-tooltip={label}
    >
      {children}
    </button>
  );
}

export function SidebarNav() {
  const t = useT();
  const { collapseAll } = useFileTreeExpand();

  return (
    <nav className="boke-sidebar-nav" aria-label={t("sidebar.navAria")}>
      <SidebarNavButton label={t("sidebar.newNote")} onClick={() => void createAndOpenNote()}>
        <NoteEditIcon />
      </SidebarNavButton>
      <SidebarNavButton
        label={t("sidebar.newDrawing")}
        className="boke-sidebar-nav-btn--excalidraw"
        onClick={() => void createAndOpenDrawing()}
      >
        <ExcalidrawGrayIcon />
      </SidebarNavButton>
      <SidebarNavButton label={t("sidebar.newFolder")} onClick={() => void createFolder()}>
        <FolderPlusIcon />
      </SidebarNavButton>
      <SidebarNavButton label={t("fileTree.collapseAll")} onClick={collapseAll}>
        <CollapseAllFoldersIcon />
      </SidebarNavButton>
    </nav>
  );
}
