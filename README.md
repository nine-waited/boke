# Boke — Knowledge Manager

Local-first **Markdown + Excalidraw** knowledge manager with Obsidian-style wikilinks, plugins, and optional remote storage.

## Features

- **Local-first**: vault = plain files on disk (`notes/`, `attachments/`, `.boke/`)
- **Markdown**: CodeMirror 6 editor, wikilinks `[[note]]`, embeds `![[file]]`, YAML frontmatter
- **Excalidraw**: edit `.excalidraw` files in-app (lazy-loaded)
- **Backlinks, tags, graph view, full-text search**
- **Plugins**: ES modules in `.boke/plugins/` (see `examples/plugins/hello-world`)
- **Remote mode**: FastAPI server + `RemoteRestAdapter`
- **Blog publish**: notes with `publish: true` → static HTML + RSS export
- **Dual runtime**: Web PWA + Tauri 2 desktop

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+
- (Desktop) Rust + [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

### Install

```bash
cd boke
pnpm install
```

### Web (browser)

```bash
pnpm dev
# open http://localhost:5173
# Click "Open vault folder" (Chromium) or use OPFS sandbox
```

Or use the launcher scripts:

```bash
# Windows
scripts\start-web.bat

# Linux/macOS
./scripts/start-web.sh
```

### Desktop (Tauri)

```bash
pnpm dev:desktop
# First release build — generate icons:
cd apps/desktop && pnpm tauri icon ../../apps/web/public/favicon.svg
pnpm build:desktop
```

### Sample vault

Open `examples/sample-vault` as your vault folder to try wikilinks, Excalidraw, and the hello-world plugin.

### Remote server

```bash
cd server
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
python main.py
```

Configure in app Settings: Base URL `http://localhost:8787`, Token from `.env`, Vault path `default`.

See [docs/self-host.md](docs/self-host.md) for Nginx deployment.

## Project structure

```
boke/
├── apps/web          # Vite PWA
├── apps/desktop      # Tauri 2 shell
├── packages/
│   ├── core          # Vault service, metadata, search, plugins
│   ├── ui            # React UI
│   ├── plugin-sdk    # Plugin API types
│   └── storage-adapters
├── server/           # FastAPI remote vault API
├── examples/         # Sample vault & plugins
└── docs/
```

## Plugin development

Copy `examples/plugins/hello-world` to `.boke/plugins/hello-world` in your vault, enable in Settings, run command **Say hello from plugin**.

See [docs/plugin-guide.md](docs/plugin-guide.md).

## License

MIT — see [LICENSE](LICENSE).
