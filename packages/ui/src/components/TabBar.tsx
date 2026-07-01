import { useSyncExternalStore } from "react";
import { workspaceStore } from "../store.js";

export function TabBar() {
  const state = useSyncExternalStore(
    (cb) => workspaceStore.subscribe(cb),
    () => workspaceStore.getState(),
  );

  const label = (leaf: (typeof state.leaves)[0]) => {
    switch (leaf.type) {
      case "markdown":
        return leaf.path?.split("/").pop() ?? "Note";
      case "excalidraw":
        return `📐 ${leaf.path?.split("/").pop() ?? "Drawing"}`;
      case "graph":
        return "Graph";
      case "settings":
        return "Settings";
      case "publish":
        return "Publish";
      default:
        return "Welcome";
    }
  };

  return (
    <div className="boke-tabs">
      {state.leaves.map((leaf) => (
        <div
          key={leaf.id}
          className={`boke-tab${leaf.id === state.activeId ? " active" : ""}`}
          onClick={() => workspaceStore.setActive(leaf.id)}
        >
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
