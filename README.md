# Boke — Knowledge Manager

Desktop-first **Markdown + Excalidraw** knowledge manager with Obsidian-style wikilinks, plugins, local folders, and optional cloud storage via REST API.

## Features

- **Local-first**: vault = plain files on disk (`notes/`, `attachments/`, `.boke/`)
- **Desktop app**: Tauri 2 — open any local folder with full filesystem access
- **Cloud storage**: configure REST API endpoint (see `server/` reference implementation)
- **Markdown**: CodeMirror 6 editor, wikilinks `[[note]]`, embeds `![[file]]`, YAML frontmatter
- **Excalidraw**: edit `.excalidraw` files in-app (lazy-loaded)
- **Backlinks, tags, graph view, full-text search**
- **Plugins**: ES modules in `.boke/plugins/` (see `examples/plugins/hello-world`)
- **Blog publish**: notes with `publish: true` → static HTML + RSS export

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

First release build — generate icons:

```bash
cd apps/desktop && pnpm tauri icon public/favicon.svg
pnpm build:desktop
```

### Storage modes

| Mode | How |
|------|-----|
| **Local folder** | Welcome screen → 打开本地文件夹 |
| **Cloud (REST)** | Settings → configure Base URL / Token / Vault path → 连接云端 vault |

Cloud API contract: see [docs/cloud-storage.md](docs/cloud-storage.md) and `server/main.py`.

### Sample vault

Open `examples/sample-vault` as your vault folder to try wikilinks, Excalidraw, and the hello-world plugin.

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
