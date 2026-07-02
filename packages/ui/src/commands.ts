import { commandRegistry, workspaceStore } from "./store.js";
import { createAndOpenDrawing, createAndOpenNote } from "./note-actions.js";

export function registerCoreCommands(): void {
  commandRegistry.register({
    id: "boke:new-note",
    name: "New note",
    category: "Boke",
    callback: async () => {
      await createAndOpenNote();
    },
  });

  commandRegistry.register({
    id: "boke:new-drawing",
    name: "New Excalidraw drawing",
    category: "Boke",
    callback: async () => {
      await createAndOpenDrawing();
    },
  });

  commandRegistry.register({
    id: "boke:open-graph",
    name: "Open graph view",
    category: "Boke",
    callback: () => {
      workspaceStore.openGraph();
    },
  });

  commandRegistry.register({
    id: "boke:open-settings",
    name: "Open settings",
    category: "Boke",
    callback: () => {
      workspaceStore.openSettings();
    },
  });

  commandRegistry.register({
    id: "boke:open-publish",
    name: "Open publish panel",
    category: "Boke",
    callback: () => {
      workspaceStore.openPublish();
    },
  });

  commandRegistry.register({
    id: "boke:toggle-source",
    name: "Toggle live / source",
    category: "Boke",
    callback: () => {
      const state = workspaceStore.getState();
      const leaf = state.active;
      if (leaf?.type === "markdown" && leaf.path) {
        const next = leaf.mode === "source" ? "live" : "source";
        workspaceStore.setMode(leaf.id, next);
      }
    },
  });
}
