import { useEffect, useRef, useState, useSyncExternalStore, type DragEvent, type MouseEvent } from "react";
import type { PaneId } from "@chestnut/core";
import { useT } from "../i18n/index.js";
import { useAppStore, workspaceStore } from "../store.js";
import { ExcalidrawGrayIcon, ImageGrayIcon, MarkdownGrayIcon, PdfGrayIcon } from "../icons/sidebar-icons.js";
import { focusMainContent, isFileContentTab } from "../focus-main-content.js";
import { createAndOpenNote } from "../note-actions.js";
import { ContextMenuFrame } from "./ContextMenuFrame.js";

const TAB_DRAG_MIME = "application/x-chestnut-tab";

function TabContextMenu({
  paneId,
  tabId,
  tabIndex,
  tabCount,
  onClose,
}: {
  paneId: PaneId;
  tabId: string;
  tabIndex: number;
  tabCount: number;
  onClose: () => void;
}) {
  const t = useT();

  const run = (action: () => void) => {
    onClose();
    action();
  };

  const leaf = workspaceStore.getState().panes[paneId].leaves.find((l) => l.id === tabId);
  const canCloseThis = !(tabCount === 1 && leaf?.type === "empty");
  const canCloseOthers = tabCount > 1;
  const canCloseLeft = tabIndex > 0;
  const canCloseRight = tabIndex >= 0 && tabIndex < tabCount - 1;

  const item = (label: string, disabled: boolean, action: () => void) => (
    <button
      type="button"
      className={`boke-context-menu-item${disabled ? " boke-context-menu-item--disabled" : ""}`}
      onClick={() => {
        if (disabled) return;
        run(action);
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      {item(t("tab.close"), !canCloseThis, () => workspaceStore.closeTab(tabId))}
      {item(t("tab.closeOthers"), !canCloseOthers, () => workspaceStore.closeOtherTabs(tabId))}
      {item(t("tab.closeToLeft"), !canCloseLeft, () => workspaceStore.closeTabsToLeft(tabId))}
      {item(t("tab.closeToRight"), !canCloseRight, () => workspaceStore.closeTabsToRight(tabId))}
      {item(t("tab.closeAll"), !canCloseThis, () => workspaceStore.closeAllTabs(paneId))}
    </>
  );
}

export function TabBar({ paneId = "left" }: { paneId?: PaneId }) {
  const t = useT();
  const tabsRef = useRef<HTMLDivElement>(null);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const state = useSyncExternalStore(
    (cb) => workspaceStore.subscribe(cb),
    () => workspaceStore.getState(),
  );
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    tabId: string;
    tabIndex: number;
  } | null>(null);

  const pane = state.panes[paneId];
  const visibleLeaves = pane.leaves.filter((leaf) => leaf.type !== "empty");
  const isFocused = !state.split || state.focusedPane === paneId;

  useEffect(() => {
    const el = tabsRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;

      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (delta === 0) return;

      event.preventDefault();
      el.scrollLeft += delta;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [visibleLeaves.length]);

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

  const label = (leaf: (typeof pane.leaves)[0]) => {
    switch (leaf.type) {
      case "markdown":
        return leaf.path?.split("/").pop() ?? t("tab.note");
      case "excalidraw":
        return leaf.path?.split("/").pop() ?? t("tab.drawing");
      case "image":
        return leaf.path?.split("/").pop() ?? t("tab.image");
      case "pdf":
        return leaf.path?.split("/").pop() ?? t("tab.pdf");
      case "graph":
        return t("tab.graph");
      case "settings":
        return t("tab.settings");
      case "publish":
        return t("tab.publish");
      default:
        return t("tab.note");
    }
  };

  const openContextMenu = (event: MouseEvent, tabId: string, tabIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    workspaceStore.setActive(tabId);
    setContextMenu({ x: event.clientX, y: event.clientY, tabId, tabIndex });
  };

  const onDragStart = (event: DragEvent, leafId: string) => {
    if (!state.split) return;
    event.dataTransfer.setData(TAB_DRAG_MIME, leafId);
    event.dataTransfer.setData("text/plain", leafId);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (event: DragEvent) => {
    if (!state.split) return;
    if (![...event.dataTransfer.types].includes(TAB_DRAG_MIME) && !event.dataTransfer.types.includes("text/plain")) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (event: DragEvent) => {
    if (!state.split) return;
    event.preventDefault();
    const leafId = event.dataTransfer.getData(TAB_DRAG_MIME) || event.dataTransfer.getData("text/plain");
    if (!leafId) return;
    workspaceStore.moveLeafToPane(leafId, paneId);
  };

  return (
    <>
      <div
        className={`boke-tabs${isFocused ? " is-focused-pane" : ""}`}
        ref={tabsRef}
        data-pane={paneId}
        onMouseDown={() => workspaceStore.setFocusedPane(paneId)}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDoubleClick={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest(".boke-tab")) return;
          event.preventDefault();
          workspaceStore.setFocusedPane(paneId);
          void createAndOpenNote();
        }}
      >
        {visibleLeaves.map((leaf, index) => (
          <div
            key={leaf.id}
            className={`boke-tab${leaf.id === pane.activeId ? " active" : ""}${contextMenu?.tabId === leaf.id ? " context-target" : ""}`}
            draggable={state.split}
            onDragStart={(e) => onDragStart(e, leaf.id)}
            onClick={() => {
              workspaceStore.setActive(leaf.id);
              if (isFileContentTab(leaf.type)) focusMainContent(paneId);
            }}
            onDoubleClick={() => {
              if (!isFileContentTab(leaf.type)) return;
              workspaceStore.setActive(leaf.id);
              const nextCollapsed = !sidebarCollapsed;
              setSidebarCollapsed(nextCollapsed);
              focusMainContent(paneId);
            }}
            onContextMenu={(e) => openContextMenu(e, leaf.id, index)}
          >
            {leaf.type === "markdown" && (
              <span className="boke-tab-icon boke-tab-icon--markdown" aria-hidden="true">
                <MarkdownGrayIcon />
              </span>
            )}
            {leaf.type === "excalidraw" && (
              <span className="boke-tab-icon boke-tab-icon--excalidraw" aria-hidden="true">
                <ExcalidrawGrayIcon />
              </span>
            )}
            {leaf.type === "image" && (
              <span className="boke-tab-icon boke-tab-icon--image" aria-hidden="true">
                <ImageGrayIcon />
              </span>
            )}
            {leaf.type === "pdf" && (
              <span className="boke-tab-icon boke-tab-icon--pdf" aria-hidden="true">
                <PdfGrayIcon />
              </span>
            )}
            {label(leaf)}
            <button
              className="boke-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                workspaceStore.closeTab(leaf.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {contextMenu && (
        <ContextMenuFrame
          x={contextMenu.x}
          y={contextMenu.y}
          className="boke-context-menu boke-context-menu--tab"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <TabContextMenu
            paneId={paneId}
            tabId={contextMenu.tabId}
            tabIndex={contextMenu.tabIndex}
            tabCount={visibleLeaves.length}
            onClose={() => setContextMenu(null)}
          />
        </ContextMenuFrame>
      )}
    </>
  );
}
