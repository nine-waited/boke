import type { ReactNode } from "react";
import { ExcalidrawGrayIcon, FolderPlusIcon, NoteEditIcon } from "../icons/sidebar-icons.js";
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
  return (
    <nav className="boke-sidebar-nav" aria-label="侧边栏操作">
      <SidebarNavButton label="新建 Markdown 笔记" onClick={() => void createAndOpenNote()}>
        <NoteEditIcon />
      </SidebarNavButton>
      <SidebarNavButton
        label="新建 Excalidraw 绘图"
        className="boke-sidebar-nav-btn--excalidraw"
        onClick={() => void createAndOpenDrawing()}
      >
        <ExcalidrawGrayIcon />
      </SidebarNavButton>
      <SidebarNavButton label="新建文件夹" onClick={() => void createFolder()}>
        <FolderPlusIcon />
      </SidebarNavButton>
    </nav>
  );
}
