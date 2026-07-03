# Boke

**Desktop knowledge app for local Markdown and Excalidraw files.**

English · [中文](README.zh-CN.md)

---

Boke is a **desktop** app (Tauri 2) that reads and writes plain files in a folder you choose. Your vault is just files on disk — no proprietary database, no cloud requirement.

## What it stores

| Type | Format |
|------|--------|
| Notes | `.md` |
| Drawings | `.excalidraw` |
| Images | Saved next to notes (e.g. `{NoteName}_pic/`) |
| App config | `.boke/` (settings, optional plugins) |

## Features

**Vault**

- Pick any local folder as the vault; default on first launch: `~/.boke`
- Auto-save: Markdown ~400 ms debounce; Excalidraw ~600 ms debounce
- `Ctrl+S` saves the current note or drawing immediately
- File tree with create, rename, and delete (filesystem operations)

**Markdown**

- Live preview (Milkdown) and source mode (CodeMirror)
- `[[wikilinks]]`, `![[embeds]]`, `#tags`, YAML frontmatter
- Outline panel with click-to-jump headings
- Inline title bar to rename the note file
- Paste or drag-drop images into a note; images are stored beside the note

**Excalidraw**

- Open and edit `.excalidraw` files in-app
- Scene auto-saves to the vault file; built-in “Save to disk” is disabled so everything stays in your folder

**Navigation**

- Quick open (`Shift+Shift` by default)
- Full-text search (`Ctrl+Shift+F` by default)
- Customizable shortcuts in Settings
- Tab bar for Markdown and Excalidraw

## Keyboard shortcuts

| Action | Default |
|--------|---------|
| Quick open | `Shift+Shift` |
| Full-text search | `Ctrl+Shift+F` |
| Save | `Ctrl+S` |

## Quick start

**Prerequisites:** Node.js 20+, pnpm 9+, Rust and [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (Windows: MSVC Build Tools).

```bash
cd boke
pnpm install
pnpm dev
```

On first launch the app opens `~/.boke` (created if missing).

**Change vault folder:** edit the path in the toolbar, use the folder icon, or set it under **Settings → Local storage**.

**Sample vault:** point the vault path to `examples/sample-vault`.

**Windows installer (x64 NSIS):**

```bash
pnpm build:desktop:win64
```

Output: `apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Boke_*-setup.exe`

First release build — generate icons:

```bash
cd apps/desktop && pnpm tauri icon public/favicon.svg
```

## Project structure

```
boke/
├── apps/desktop          # Tauri desktop app
├── packages/
│   ├── core              # Vault service, metadata, search
│   ├── ui                # React UI
│   ├── plugin-sdk        # Plugin API types
│   └── storage-adapters  # Local filesystem adapter
├── examples/             # Sample vault
└── docs/
```

## License

MIT — see [LICENSE](LICENSE).
