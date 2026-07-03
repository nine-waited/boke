import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { useT } from "../i18n/index.js";
import { useAppStore, workspaceStore } from "../store.js";
import { ExcalidrawGrayIcon, ImageGrayIcon, MarkdownGrayIcon } from "../icons/sidebar-icons.js";
import { focusMainContent, isFileContentTab } from "../focus-main-content.js";

function TabContextMenu({
  tabId,
  tabIndex,
  tabCount,
  onClose,
}: {
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

  const canClose = tabCount > 1;
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
      {item(t("tab.close"), !canClose, () => workspaceStore.closeTab(tabId))}
      {item(t("tab.closeOthers"), !canClose, () => workspaceStore.closeOtherTabs(tabId))}
      {item(t("tab.closeToLeft"), !canCloseLeft, () => workspaceStore.closeTabsToLeft(tabId))}
      {item(t("tab.closeToRight"), !canCloseRight, () => workspaceStore.closeTabsToRight(tabId))}
      {item(t("tab.closeAll"), !canClose, () => workspaceStore.closeAllTabs(tabId))}
    </>
  );
}

export function TabBar() {
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
  }, [state.leaves.length]);

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

  const label = (leaf: (typeof state.leaves)[0]) => {
    switch (leaf.type) {
      case "markdown":
        return leaf.path?.split("/").pop() ?? t("tab.note");
      case "excalidraw":
        return leaf.path?.split("/").pop() ?? t("tab.drawing");
      case "image":
        return leaf.path?.split("/").pop() ?? t("tab.image");
      case "graph":
        return t("tab.graph");
      case "settings":
        return t("tab.settings");
      case "publish":
        return t("tab.publish");
      default:
        return t("tab.welcome");
    }
  };

  const openContextMenu = (event: MouseEvent, tabId: string, tabIndex: number) => {
    event.preventDefault();
    event.stopPropagation();
    workspaceStore.setActive(tabId);
    setContextMenu({ x: event.clientX, y: event.clientY, tabId, tabIndex });
  };

  return (
    <>
      <div className="boke-tabs" ref={tabsRef}>
        {state.leaves.map((leaf, index) => (
          <div
            key={leaf.id}
            className={`boke-tab${leaf.id === state.activeId ? " active" : ""}${contextMenu?.tabId === leaf.id ? " context-target" : ""}`}
            onClick={() => workspaceStore.setActive(leaf.id)}
            onDoubleClick={() => {
              if (!isFileContentTab(leaf.type)) return;
              workspaceStore.setActive(leaf.id);
              const nextCollapsed = !sidebarCollapsed;
              setSidebarCollapsed(nextCollapsed);
              if (nextCollapsed) focusMainContent();
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
            {label(leaf)}
            {state.leaves.length > 1 && (
              <button
                className="boke-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  workspaceStore.closeTab(leaf.id);
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      {contextMenu && (
        <div
          className="boke-context-menu boke-context-menu--tab"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <TabContextMenu
            tabId={contextMenu.tabId}
            tabIndex={contextMenu.tabIndex}
            tabCount={state.leaves.length}
            onClose={() => setContextMenu(null)}
          />
        </div>
      )}
    </>
  );
}
