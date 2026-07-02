import { useSyncExternalStore, useEffect, lazy, Suspense } from "react";
import { TabBar } from "./components/TabBar.js";
import { FileTree } from "./components/FileTree.js";
import { BacklinksPanel, TagsPanel } from "./components/BacklinksPanel.js";
import { WelcomeScreen } from "./components/WelcomeScreen.js";
import { NotePane, ModeToggle } from "./components/NotePane.js";
import { GraphView } from "./components/GraphView.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { PublishPanel } from "./components/PublishPanel.js";
import { CommandPalette } from "./components/CommandPalette.js";
import { SearchPanel } from "./components/SearchPanel.js";
import {
  useAppStore,
  workspaceStore,
  vaultService,
  commandRegistry,
} from "./store.js";
import { registerCoreCommands } from "./commands.js";
import { createAndOpenNote } from "./note-actions.js";

const ExcalidrawView = lazy(() =>
  import("./components/ExcalidrawView.js").then((m) => ({ default: m.ExcalidrawView })),
);

let commandsRegistered = false;

function EditorContent() {
  const state = useSyncExternalStore(
    (cb) => workspaceStore.subscribe(cb),
    () => workspaceStore.getState(),
  );
  const vaultMounted = useAppStore((s) => s.vaultMounted);

  if (!vaultMounted) return <WelcomeScreen />;

  const active = state.active;
  if (!active || active.type === "empty") {
    return (
      <div className="boke-welcome">
        <p>Select a file or create a new note.</p>
        <button onClick={() => createAndOpenNote()}>New note</button>
      </div>
    );
  }

  switch (active.type) {
    case "markdown":
      return (
        <div className="boke-markdown-shell">
          {active.path && <ModeToggle leafId={active.id} mode={active.mode ?? "live"} />}
          {active.path && (
            <NotePane path={active.path} mode={active.mode ?? "live"} leafId={active.id} />
          )}
        </div>
      );
    case "excalidraw":
      return active.path ? (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading drawing…</div>}>
          <ExcalidrawView path={active.path} />
        </Suspense>
      ) : null;
    case "graph":
      return <GraphView />;
    case "settings":
      return <SettingsPanel />;
    case "publish":
      return <PublishPanel />;
    default:
      return null;
  }
}

export function App() {
  const vaultMounted = useAppStore((s) => s.vaultMounted);
  const sidebarTab = useAppStore((s) => s.sidebarTab);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const statusText = useAppStore((s) => s.statusText);
  const vaultName = useAppStore((s) => s.vaultName);

  useEffect(() => {
    if (!commandsRegistered) {
      registerCoreCommands();
      commandsRegistered = true;
    }
  }, []);

  return (
    <div className="boke-app">
      <div className="boke-toolbar">
        <strong>Boke</strong>
        {vaultMounted && <span style={{ color: "var(--boke-text-muted)", fontSize: 13 }}>{vaultName}</span>}
        <div style={{ flex: 1 }} />
        <button onClick={() => setCommandPaletteOpen(true)} title="Ctrl+P">
          Quick open
        </button>
        <button onClick={() => setSearchOpen(true)} title="Ctrl+Shift+F">
          Search
        </button>
        <button onClick={() => commandRegistry.run("boke:new-note")}>New note</button>
        <button onClick={() => commandRegistry.run("boke:new-drawing")}>New drawing</button>
        <button onClick={() => commandRegistry.run("boke:open-graph")}>Graph</button>
        <button onClick={() => commandRegistry.run("boke:open-publish")}>Publish</button>
        <button onClick={() => commandRegistry.run("boke:open-settings")}>Settings</button>
      </div>

      <div className="boke-main">
        {vaultMounted && (
          <aside className="boke-sidebar">
            <div className="boke-sidebar-tabs">
              <button
                className={sidebarTab === "files" ? "active" : ""}
                onClick={() => setSidebarTab("files")}
              >
                Files
              </button>
              <button
                className={sidebarTab === "backlinks" ? "active" : ""}
                onClick={() => setSidebarTab("backlinks")}
              >
                Backlinks
              </button>
              <button
                className={sidebarTab === "tags" ? "active" : ""}
                onClick={() => setSidebarTab("tags")}
              >
                Tags
              </button>
            </div>
            <div className="boke-sidebar-content">
              {sidebarTab === "files" && <FileTree />}
              {sidebarTab === "backlinks" && <BacklinksPanel />}
              {sidebarTab === "tags" && <TagsPanel />}
            </div>
          </aside>
        )}

        <div className="boke-editor-area">
          {vaultMounted && <TabBar />}
          <div className="boke-content">
            <EditorContent />
          </div>
        </div>
      </div>

      <div className="boke-statusbar">{statusText || "Ready"}</div>

      <CommandPalette />
      <SearchPanel />
    </div>
  );
}

export { useAppStore, vaultService, workspaceStore, commandRegistry } from "./store.js";
