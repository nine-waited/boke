# Chestnut

**Chestnut Editor — 面向本地 Markdown 与 Excalidraw 的桌面编辑器。**

[English](README.md) · 中文

---

Chestnut Editor 是一款**桌面**应用（Tauri 2），在你选择的本地文件夹中直接读写普通文件。知识库就是磁盘上的文件，没有专有数据库，也不依赖云端。

## 界面截图

![Chestnut 桌面端界面](docs/images/desktop-ui.png)

## 界面说明

| 区域 | 说明 |
|------|------|
| **顶部工具栏** | 显示当前知识库路径（可编辑）。右侧为 **Quick open**（快速打开）、**Search**（搜索）、**Settings**（设置）。 |
| **左侧边栏** | 顶部三个图标：新建笔记、新建 Excalidraw 绘图、新建文件夹。下方为文件树，可打开、重命名、删除文件与文件夹。 |
| **编辑区（中间）** | 标签页切换已打开文件。Markdown 支持 **实时** / **源码** 两种模式；顶部标题栏可重命名笔记。块级编辑、实时渲染，支持粘贴或拖拽插入图片。 |
| **目录（右侧）** | 根据笔记标题生成大纲，点击可跳转到对应位置。 |
| **状态栏** | 底部显示应用状态（如 Ready）。 |

## 存储内容

| 类型 | 格式 |
|------|------|
| 笔记 | `.md` |
| 绘图 | `.excalidraw` |
| 图片 | 保存在笔记旁（如 `{笔记名}_pic/`） |

## 功能

**知识库**

- 任意本地文件夹可作为知识库；首次启动默认 `~/.chestnut`
- 自动保存：Markdown 约 400 ms 防抖；Excalidraw 约 600 ms 防抖
- `Ctrl+S` 立即保存当前笔记或绘图
- 文件树支持新建、重命名、删除（对应文件系统操作）

**Markdown**

- 实时预览（Milkdown）与源码模式（CodeMirror）
- `[[双链]]`、`![[嵌入]]`、`#标签`、YAML frontmatter
- 大纲面板，点击跳转标题
- 编辑器顶部标题栏可重命名笔记文件
- 粘贴或拖拽图片到笔记，图片保存在笔记旁边

**Excalidraw**

- 在应用内打开并编辑 `.excalidraw` 文件
- 画布自动保存到知识库文件；已关闭 Excalidraw 自带的「另存为」，统一写入你的文件夹

**导航**

- 快速打开（默认 `Shift+Shift` 双击 Shift）
- 全文搜索（默认 `Ctrl+Shift+F`）
- 可在设置中自定义快捷键
- 标签页区分 Markdown 与 Excalidraw

## 快捷键

| 操作 | 默认按键 |
|------|----------|
| 快速打开 | `Shift+Shift` |
| 全文搜索 | `Ctrl+Shift+F` |
| 保存 | `Ctrl+S` |

## 快速开始

**环境要求：** Node.js 20+、pnpm 9+、Rust 及 [Tauri 环境](https://v2.tauri.app/start/prerequisites/)（Windows 需 MSVC 构建工具）。

```bash
cd Chestnut
pnpm install
pnpm dev
```

首次启动会打开 `~/.chestnut`（不存在则自动创建）。

**更换知识库路径：** 在工具栏编辑路径、点击文件夹图标，或在 **设置 → 本地存储** 中修改。

**示例知识库：** 将路径指向 `examples/sample-vault`。

**Windows 安装包（x64 NSIS）：**

```bash
pnpm build:desktop:win64
```

输出：`apps/desktop/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/Chestnut_*-setup.exe`

首次打包前生成图标：

```bash
cd apps/desktop && pnpm tauri icon public/favicon.svg
```

## 项目结构

```
Chestnut/
├── apps/desktop          # Tauri 桌面端
├── packages/
│   ├── core              # 知识库服务、元数据、搜索
│   ├── ui                # React 界面
│   └── storage-adapters  # 本地文件系统适配器
├── examples/             # 示例知识库
└── docs/
    └── images/           # README 截图
```

## 许可证

MIT — 见 [LICENSE](LICENSE)。
