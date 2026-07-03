# Boke — Knowledge Manager

Desktop-first **Markdown + Excalidraw** knowledge manager with Obsidian-style wikilinks, plugins, and local-first file storage.

## Features

### Core

- **Local-first**: vault = plain files on disk (`.md`, `.excalidraw`, images, `.boke/` config)
- **Desktop app**: Tauri 2 — full filesystem access; default vault at `~/.boke` on first launch
- **Auto-save**: Markdown edits debounce to disk (~400 ms); `Ctrl+S` saves immediately
- **Vault path**: editable in the toolbar; pick a folder with the folder icon

### Markdown

- **Dual modes**: Live preview (Milkdown Crepe) and Source (CodeMirror 6)
- **Wikilinks** `[[note]]`, embeds `![[file]]`, `#tags`, YAML frontmatter
- **Outline panel** with click-to-jump headings
- **Inline title bar** — rename the note file from the editor
- **Screenshot paste / drag-drop**: images saved to `{NoteName}_pic/` next to the note; markdown links use the local absolute path for easy export and lookup
- **Note images follow renames** — renaming a note also renames its `_pic` folder and updates image paths in the document

### Excalidraw

- Edit `.excalidraw` files in-app (lazy-loaded)
- Auto-save (~600 ms debounce); `Ctrl+S` writes to the current vault file (not “Save As”)

### Navigation & search

- **Quick open** (`Shift+Shift` by default): fuzzy file list, keyboard navigation, delete from list
- **Full-text search** (`Ctrl+Shift+F` by default)
- **Configurable shortcuts** in Settings
- **File tree**: folders, context menu (new / rename / delete), selection sync with open tabs
- **Backlinks, tags, graph view** (graph available via commands)
- **Tab bar** with Markdown / Excalidraw icons

### Other

- **Plugins**: ES modules in `.boke/plugins/` (see `examples/plugins/hello-world`)
- **Blog publish**: notes with `publish: true` → static HTML + RSS export (via commands)
- **Themes**: Light / Dark in Settings
- **Cloud storage (REST API)**: adapter and reference server exist; UI entry is currently hidden (see `docs/cloud-storage.md`)

## Keyboard shortcuts

Default bindings (customizable in **Settings → 快捷键**):

| Action | Default |
|--------|---------|
| Quick open | `Shift+Shift` (double-tap Shift within 400 ms) |
| Full-text search | `Ctrl+Shift+F` |
| Save (Markdown / Excalidraw) | `Ctrl+S` |

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Rust + [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (Windows: MSVC Build Tools)

### Install & run

```bash
cd boke
pnpm install
pnpm dev
```

On first launch the app opens `~/.boke` (creates it if missing) and opens `README.md`.

First release build — generate icons:

```bash
cd apps/desktop && pnpm tauri icon public/favicon.svg
```

**64-bit Windows installer (NSIS `.exe`)** — cleans build cache, then bundles x64 only:

```bash
pnpm build:desktop:win64
```

Output: `apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Boke_*-setup.exe`

The installer refuses 32-bit Windows. WebView2 is downloaded at install time (not bundled as a 127 MB offline cache).

Legacy build without cache clean:

```bash
pnpm build:desktop
```

### Change vault folder

- Click the path in the toolbar to edit, or use the folder icon to pick a directory
- Or open **Settings → 本地存储** to set the path

Cloud API contract (optional): [docs/cloud-storage.md](docs/cloud-storage.md) and `server/main.py`.

### Sample vault

Point the vault path to `examples/sample-vault` to try wikilinks, Excalidraw, and the hello-world plugin.

## Project structure

```
boke/
├── apps/desktop      # Tauri 2 desktop app (primary)
├── packages/
│   ├── core          # Vault service, metadata, search, plugins
│   ├── ui            # React UI
│   ├── plugin-sdk    # Plugin API types
│   └── storage-adapters  # Tauri local FS + REST cloud
├── server/           # Reference cloud storage API (FastAPI)
├── examples/         # Sample vault & plugins
└── docs/
```

## Plugin development

Copy `examples/plugins/hello-world` to `.boke/plugins/hello-world` in your vault, enable in Settings, run command **Say hello from plugin**.

See [docs/plugin-guide.md](docs/plugin-guide.md).

## License

MIT — see [LICENSE](LICENSE).
