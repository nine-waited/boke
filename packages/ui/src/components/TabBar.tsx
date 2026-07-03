import { useSyncExternalStore } from "react";
import { useT } from "../i18n/index.js";
import { useAppStore, workspaceStore } from "../store.js";
import { ExcalidrawGrayIcon, ImageGrayIcon, MarkdownGrayIcon } from "../icons/sidebar-icons.js";
import { focusMainContent, isFileContentTab } from "../focus-main-content.js";

export function TabBar() {
  const t = useT();
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const state = useSyncExternalStore(
    (cb) => workspaceStore.subscribe(cb),
    () => workspaceStore.getState(),
  );

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

  return (
    <div className="boke-tabs">
      {state.leaves.map((leaf) => (
        <div
          key={leaf.id}
          className={`boke-tab${leaf.id === state.activeId ? " active" : ""}`}
          onClick={() => workspaceStore.setActive(leaf.id)}
          onDoubleClick={() => {
            if (!isFileContentTab(leaf.type)) return;
            workspaceStore.setActive(leaf.id);
            const nextCollapsed = !sidebarCollapsed;
            setSidebarCollapsed(nextCollapsed);
            if (nextCollapsed) focusMainContent();
          }}
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
  );
}
