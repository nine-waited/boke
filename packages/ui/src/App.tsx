import {
  useSyncExternalStore,
  useEffect,
  useLayoutEffect,
  useRef,
  lazy,
  Suspense,
  type CSSProperties,
  type ReactNode,
} from "react";
import { isTauri, TauriFsAdapter } from "@chestnut/storage-adapters";
import type { LeafMode } from "@chestnut/core";
import { normalizeLeafMode } from "@chestnut/core";
import { TabBar } from "./components/TabBar.js";
import { FileTree } from "./components/FileTree.js";
import { FileTreeExpandProvider } from "./file-tree-expand-context.js";
import { SidebarNav } from "./components/SidebarNav.js";
import { SidebarBoundaryControl } from "./components/SidebarBoundaryControl.js";
import { NotePane } from "./components/NotePane.js";
import { ImageView } from "./components/ImageView.js";
import { PdfView } from "./components/PdfView.js";
import { GraphView } from "./components/GraphView.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { PublishPanel } from "./components/PublishPanel.js";
import { CommandPalette } from "./components/CommandPalette.js";
import { SearchPanel } from "./components/SearchPanel.js";
import { GlobalKeyboardShortcuts } from "./components/GlobalKeyboardShortcuts.js";
import { ToolbarVaultPath } from "./components/ToolbarVaultPath.js";
import { ToolbarIconButton } from "./components/ToolbarIconButton.js";
import { ToolbarImportMarkdownButton } from "./components/ToolbarImportMarkdownButton.js";
import { QuickOpenIcon, SearchIcon, SettingsIcon } from "./icons/toolbar-icons.js";
import { formatShortcutLabel } from "./keyboard-shortcuts.js";
import { useT } from "./i18n/index.js";
import {
  useAppStore,
  workspaceStore,
  vaultService,
  commandRegistry,
  editorPaneLru,
} from "./store.js";
import { clearSourceEditorHistory } from "./source-editor-history-cache.js";
import { registerCoreCommands } from "./commands.js";
import { ConfirmDialogHost } from "./confirm-dialog.js";
import { ExportProgressHost } from "./export-progress.js";
import { createAndOpenNote } from "./note-actions.js";

const ExcalidrawView = lazy(() =>
  import("./components/ExcalidrawView.js").then((m) => ({ default: m.ExcalidrawView })),
);

let commandsRegistered = false;

function EditorContent() {
  const t = useT();
  const state = useSyncExternalStore(
    (cb) => workspaceStore.subscribe(cb),
    () => workspaceStore.getState(),
  );
  useSyncExternalStore(
    (cb) => editorPaneLru.subscribe(cb),
    () => editorPaneLru.getSnapshot(),
  );
  const vaultMounted = useAppStore((s) => s.vaultMounted);

  const active = state.active;
  const markdownLeaves = state.leaves.filter((leaf) => leaf.type === "markdown" && leaf.path);
  const leafByPath = new Map(markdownLeaves.map((leaf) => [leaf.path!, leaf]));
  const lastModeByPathRef = useRef(new Map<string, LeafMode>());
  for (const leaf of markdownLeaves) {
    if (leaf.path) {
      lastModeByPathRef.current.set(leaf.path, normalizeLeafMode(leaf.mode));
    }
  }

  useLayoutEffect(() => {
    if (active?.type === "markdown" && active.path) {
      editorPaneLru.touch(active.path);
    }
  }, [active?.id, active?.type, active?.path]);

  useEffect(() => {
    if (vaultMounted) return;
    editorPaneLru.clear();
    clearSourceEditorHistory();
  }, [vaultMounted]);

  if (!vaultMounted) {
    return <div className="boke-vault-loading">{t("vault.loading")}</div>;
  }

  if (!active || active.type === "empty") {
    return (
      <div className="boke-welcome">
        <p>{t("welcome.hint")}</p>
        <button onClick={() => createAndOpenNote()}>{t("welcome.newNote")}</button>
      </div>
    );
  }

  const activeMarkdownPath = active.type === "markdown" ? (active.path ?? null) : null;
  // Always keep every open markdown tab mounted; LRU only adds recently replaced ghosts.
  const mountPaths = Array.from(
    new Set([
      ...markdownLeaves.map((leaf) => leaf.path!),
      ...editorPaneLru.resolveMountPaths(activeMarkdownPath),
    ]),
  );
  const markdownVisible = active.type === "markdown";

  let nonMarkdown: ReactNode = null;
  switch (active.type) {
    case "markdown":
      break;
    case "excalidraw":
      nonMarkdown = active.path ? (
        <Suspense fallback={<div style={{ padding: 24 }}>{t("excalidraw.loadingApp")}</div>}>
          <ExcalidrawView path={active.path} />
        </Suspense>
      ) : null;
      break;
    case "image":
      nonMarkdown = active.path ? <ImageView path={active.path} /> : null;
      break;
    case "pdf":
      nonMarkdown = active.path ? <PdfView path={active.path} /> : null;
      break;
    case "graph":
      nonMarkdown = <GraphView />;
      break;
    case "settings":
      nonMarkdown = <SettingsPanel />;
      break;
    case "publish":
      nonMarkdown = <PublishPanel />;
      break;
    default:
      nonMarkdown = null;
  }

  return (
    <>
      {mountPaths.length > 0 && (
        <div
          className="boke-markdown-shell"
          hidden={!markdownVisible}
          aria-hidden={!markdownVisible}
        >
          {mountPaths.map((path) => {
            const leaf = leafByPath.get(path);
            const isActive = markdownVisible && active.path === path;
            const mode = leaf ? normalizeLeafMode(leaf.mode) : (lastModeByPathRef.current.get(path) ?? "live");
            return (
              <div
                key={path}
                className={`boke-note-pane-slot${isActive ? " is-active" : ""}`}
                aria-hidden={!isActive}
              >
                <NotePane
                  path={path}
                  mode={mode}
                  leafId={leaf?.id ?? `parked:${path}`}
                  isActive={isActive}
                />
              </div>
            );
          })}
        </div>
      )}
      {nonMarkdown}
    </>
  );
}

export function App() {
  const t = useT();
  const vaultMounted = useAppStore((s) => s.vaultMounted);
  const locale = useAppStore((s) => s.locale);
  const mountVault = useAppStore((s) => s.mountVault);
  const localVaultPath = useAppStore((s) => s.localVaultPath);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setSearchOpen = useAppStore((s) => s.setSearchOpen);
  const statusText = useAppStore((s) => s.statusText);
  const keyboardShortcuts = useAppStore((s) => s.keyboardShortcuts);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarWidth = useAppStore((s) => s.setSidebarWidth);
  const toggleSidebarCollapsed = useAppStore((s) => s.toggleSidebarCollapsed);
  const autoMountStarted = useRef(false);

  useEffect(() => {
    if (!commandsRegistered) {
      registerCoreCommands();
      commandsRegistered = true;
    }
  }, []);

  useEffect(() => {
    registerCoreCommands();
  }, [locale]);

  useEffect(() => {
    if (!isTauri() || vaultMounted || autoMountStarted.current) return;
    autoMountStarted.current = true;
    (async () => {
      try {
        const adapter = localVaultPath
          ? new TauriFsAdapter(localVaultPath)
          : await TauriFsAdapter.default();
        await mountVault(adapter);
      } catch (err) {
        console.error("Failed to open default vault:", err);
        autoMountStarted.current = false;
      }
    })();
  }, [vaultMounted, localVaultPath, mountVault]);

  return (
    <div
      className={`boke-app${sidebarCollapsed ? " boke-app--sidebar-collapsed" : ""}`}
      style={
        {
          "--boke-sidebar-width": sidebarCollapsed ? "0px" : `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <div className={`boke-toolbar${vaultMounted ? " boke-toolbar--vault-mounted" : ""}`}>
        <div className="boke-toolbar-side">
          <div className="boke-toolbar-leading">
            <span className="boke-toolbar-brand">Chestnut</span>
            <ToolbarVaultPath />
          </div>
        </div>
        <div className="boke-toolbar-center">
          <div className="boke-toolbar-actions">
            <ToolbarIconButton
              label={t("toolbar.quickOpenTooltip", {
                shortcut: formatShortcutLabel(keyboardShortcuts["quick-open"]),
              })}
              onClick={() => setCommandPaletteOpen(true)}
            >
              <QuickOpenIcon />
            </ToolbarIconButton>
            <ToolbarIconButton
              label={t("toolbar.searchTooltip", {
                shortcut: formatShortcutLabel(keyboardShortcuts.search),
              })}
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon />
            </ToolbarIconButton>
            <ToolbarIconButton
              label={t("toolbar.settingsTooltip")}
              onClick={() => commandRegistry.run("chestnut:open-settings")}
            >
              <SettingsIcon />
            </ToolbarIconButton>
            <ToolbarImportMarkdownButton />
          </div>
        </div>
      </div>

      <div className="boke-main">
        {vaultMounted && (
          <div className={`boke-sidebar-shell${sidebarCollapsed ? " is-collapsed" : ""}`}>
            <div className="boke-sidebar-panel">
              <aside className="boke-sidebar">
                <FileTreeExpandProvider>
                  <SidebarNav />
                  <div className="boke-sidebar-content">
                    <FileTree />
                  </div>
                </FileTreeExpandProvider>
              </aside>
            </div>
            <SidebarBoundaryControl
              collapsed={sidebarCollapsed}
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onToggleCollapsed={toggleSidebarCollapsed}
            />
          </div>
        )}

        <div className="boke-editor-area">
          {vaultMounted && <TabBar />}
          <div className="boke-content" tabIndex={-1}>
            <EditorContent />
          </div>
        </div>
      </div>

      <div className="boke-statusbar">{statusText || t("status.ready")}</div>

      <CommandPalette />
      <SearchPanel />
      <ConfirmDialogHost />
      <ExportProgressHost />
      <GlobalKeyboardShortcuts />
    </div>
  );
}

export { useAppStore, vaultService, workspaceStore, commandRegistry } from "./store.js";
