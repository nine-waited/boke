export type Locale = "en" | "zh-CN";

export const LOCALES: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "简体中文" },
];

type MessageTable = Record<string, string>;

const en: MessageTable = {
  "vault.loading": "Opening vault…",
  "vault.desktopOnly": "Local folder selection is only available in the desktop app.",
  "vault.pathAria": "Vault path",
  "vault.pathPlaceholder": "Enter vault folder path",
  "welcome.hint": "Select a file or create a new note.",
  "welcome.newNote": "New note",
  "toolbar.quickOpen": "Quick open",
  "toolbar.search": "Search",
  "toolbar.settings": "Settings",
  "toolbar.quickOpenTooltip": "Quick open ({shortcut})",
  "toolbar.searchTooltip": "Search notes ({shortcut})",
  "toolbar.settingsTooltip": "Open settings",
  "toolbar.pickFolder": "Choose folder",
  "toolbar.pickFolderAria": "Choose vault folder",
  "toolbar.copyVaultPath": "Copy path",
  "toolbar.copyVaultPathAria": "Copy vault path to clipboard",
  "toolbar.vaultPathAria": "Vault path",
  "toolbar.vaultPathHint": "Vault: {path}",
  "toolbar.vaultPathPickHint": "Click to choose folder — {path}",
  "status.ready": "Ready",
  "status.pickFolderFailed": "Failed to open folder picker.",
  "status.vaultPathInvalid": "Invalid vault path.",
  "status.vaultPathCopied": "Path copied.",
  "status.copyFailed": "Failed to copy to clipboard.",
  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageHint": "Choose the interface language.",
  "settings.localStorage": "Local storage",
  "settings.localStorageHint": "Notes are stored in a local folder. Edit the path or pick a folder.",
  "settings.shortcuts": "Keyboard shortcuts",
  "settings.shortcutsHint": "Use formats like Ctrl+Shift+F or Shift+Shift (double-tap Shift). Press Enter or blur to save.",
  "settings.shortcutsReset": "Reset to defaults",
  "settings.theme": "Theme",
  "settings.themeLight": "Light",
  "settings.themeDark": "Dark",
  "sidebar.navAria": "Sidebar actions",
  "sidebar.newNote": "New Markdown note",
  "sidebar.newDrawing": "New Excalidraw drawing",
  "sidebar.newFolder": "New folder",
  "sidebar.resizeAria": "Resize file sidebar",
  "sidebar.collapseAria": "Collapse file sidebar",
  "sidebar.expandAria": "Expand file sidebar to default width",
  "tab.note": "Note",
  "tab.drawing": "Drawing",
  "tab.image": "Image",
  "tab.graph": "Graph",
  "tab.settings": "Settings",
  "tab.publish": "Publish",
  "tab.welcome": "Welcome",
  "note.modeLive": "Live",
  "note.modeSource": "Source",
  "note.untitledPlaceholder": "Untitled note",
  "note.titleAria": "Note title",
  "note.loading": "Loading…",
  "note.outlineTitle": "Outline",
  "note.outlineEmpty": "No headings",
  "note.editorLivePlaceholder": "Start writing — rendered live…",
  "note.editorSourcePlaceholder": "Start writing Markdown…",
  "fileTree.rename": "Rename",
  "fileTree.delete": "Delete",
  "fileTree.deleteFolder": "Delete folder",
  "fileTree.newNote": "New note",
  "fileTree.newDrawing": "New drawing",
  "fileTree.newFolder": "New folder",
  "fileTree.renameFolderAria": "Rename folder",
  "fileTree.renameFileAria": "Rename file",
  "fileTree.deleteConfirm": "Delete “{name}”? This permanently removes files on disk and cannot be undone.",
  "fileTree.currentFolder": "Current folder",
  "fileTree.collapseAll": "Collapse all folders",
  "fileTree.collapseAllAria": "Collapse all folders in the file tree",
  "palette.quickOpenPlaceholder": "Quick open…",
  "palette.searchPlaceholder": "Search notes…",
  "palette.deleteFile": "Delete file",
  "palette.deleteFileAria": "Delete {name}",
  "palette.noResults": "No results",
  "publish.title": "Publish",
  "publish.hint": "Notes with publish: true in frontmatter can be exported as static HTML + RSS.",
  "publish.listTitle": "Publishable notes ({count})",
  "publish.generate": "Generate site",
  "publish.download": "Download bundle",
  "publish.previewTitle": "HTML preview",
  "publish.rssTitle": "RSS",
  "excalidraw.loading": "Loading drawing…",
  "excalidraw.loadingApp": "Loading Excalidraw…",
  "image.loading": "Loading image…",
  "image.loadFailed": "Failed to load “{name}”.",
  "error.title": "Something went wrong",
  "error.hint": "Try reloading the app. If the problem persists, check the console for details.",
  "commands.newNote": "New note",
  "commands.newDrawing": "New Excalidraw drawing",
  "commands.openGraph": "Open graph view",
  "commands.openSettings": "Open settings",
  "commands.openPublish": "Open publish panel",
  "commands.toggleSource": "Toggle source mode",
  "commands.category": "Boke",
  "shortcuts.quick-open": "Quick open",
  "shortcuts.search": "Full-text search",
};

const zhCN: MessageTable = {
  "vault.loading": "正在打开知识库…",
  "vault.desktopOnly": "本地文件夹选择仅在桌面版可用。",
  "vault.pathAria": "知识库路径",
  "vault.pathPlaceholder": "输入知识库文件夹路径",
  "welcome.hint": "选择文件或新建笔记。",
  "welcome.newNote": "新建笔记",
  "toolbar.quickOpen": "快速打开",
  "toolbar.search": "搜索",
  "toolbar.settings": "设置",
  "toolbar.quickOpenTooltip": "快速打开（{shortcut}）",
  "toolbar.searchTooltip": "搜索笔记（{shortcut}）",
  "toolbar.settingsTooltip": "打开设置",
  "toolbar.pickFolder": "选择文件夹",
  "toolbar.pickFolderAria": "选择知识库文件夹",
  "toolbar.copyVaultPath": "复制路径",
  "toolbar.copyVaultPathAria": "复制知识库路径",
  "toolbar.vaultPathAria": "知识库路径",
  "toolbar.vaultPathHint": "知识库：{path}",
  "toolbar.vaultPathPickHint": "点击选择文件夹 — {path}",
  "status.ready": "就绪",
  "status.pickFolderFailed": "打开文件夹选择器失败。",
  "status.vaultPathInvalid": "知识库路径无效。",
  "status.vaultPathCopied": "路径已复制。",
  "status.copyFailed": "复制到剪贴板失败。",
  "settings.title": "设置",
  "settings.language": "语言",
  "settings.languageHint": "选择界面显示语言。",
  "settings.localStorage": "本地存储",
  "settings.localStorageHint": "笔记保存在本地文件夹，可直接编辑路径或点击右侧图标选择文件夹。",
  "settings.shortcuts": "快捷键",
  "settings.shortcutsHint": "使用类似 Ctrl+Shift+F、Shift+Shift（双击 Shift）的格式，修改后按 Enter 或点击其他区域保存。",
  "settings.shortcutsReset": "恢复默认",
  "settings.theme": "主题",
  "settings.themeLight": "浅色",
  "settings.themeDark": "深色",
  "sidebar.navAria": "侧边栏操作",
  "sidebar.newNote": "新建 Markdown 笔记",
  "sidebar.newDrawing": "新建 Excalidraw 绘图",
  "sidebar.newFolder": "新建文件夹",
  "sidebar.resizeAria": "拖动调整文件栏宽度",
  "sidebar.collapseAria": "收起文件列表",
  "sidebar.expandAria": "展开文件列表至默认宽度",
  "tab.note": "笔记",
  "tab.drawing": "绘图",
  "tab.image": "图片",
  "tab.graph": "图谱",
  "tab.settings": "设置",
  "tab.publish": "发布",
  "tab.welcome": "欢迎",
  "note.modeLive": "实时",
  "note.modeSource": "源码",
  "note.untitledPlaceholder": "未命名笔记",
  "note.titleAria": "笔记标题",
  "note.loading": "加载中…",
  "note.outlineTitle": "目录",
  "note.outlineEmpty": "暂无标题",
  "note.editorLivePlaceholder": "输入内容，实时渲染…",
  "note.editorSourcePlaceholder": "开始书写 Markdown…",
  "fileTree.rename": "重命名",
  "fileTree.delete": "删除",
  "fileTree.deleteFolder": "删除文件夹",
  "fileTree.newNote": "新建笔记",
  "fileTree.newDrawing": "新建绘图",
  "fileTree.newFolder": "新建文件夹",
  "fileTree.renameFolderAria": "重命名文件夹",
  "fileTree.renameFileAria": "重命名文件",
  "fileTree.deleteConfirm": "确定删除「{name}」？此操作会永久删除磁盘上的文件，且无法撤销。",
  "fileTree.currentFolder": "当前文件夹",
  "fileTree.collapseAll": "折叠所有目录",
  "fileTree.collapseAllAria": "折叠文件树中的所有目录",
  "palette.quickOpenPlaceholder": "快速打开…",
  "palette.searchPlaceholder": "搜索笔记…",
  "palette.deleteFile": "删除文件",
  "palette.deleteFileAria": "删除 {name}",
  "palette.noResults": "无结果",
  "publish.title": "发布",
  "publish.hint": "在 frontmatter 中设置 publish: true 的笔记可导出为静态 HTML + RSS。",
  "publish.listTitle": "可发布笔记（{count}）",
  "publish.generate": "生成站点",
  "publish.download": "下载打包",
  "publish.previewTitle": "HTML 预览",
  "publish.rssTitle": "RSS",
  "excalidraw.loading": "加载绘图中…",
  "excalidraw.loadingApp": "加载 Excalidraw…",
  "image.loading": "加载图片中…",
  "image.loadFailed": "无法加载「{name}」。",
  "error.title": "出错了",
  "error.hint": "请尝试重新加载应用。若问题持续，请查看控制台日志。",
  "commands.newNote": "新建笔记",
  "commands.newDrawing": "新建 Excalidraw 绘图",
  "commands.openGraph": "打开图谱",
  "commands.openSettings": "打开设置",
  "commands.openPublish": "打开发布面板",
  "commands.toggleSource": "切换源码模式",
  "commands.category": "Boke",
  "shortcuts.quick-open": "快速打开",
  "shortcuts.search": "全文搜索",
};

export const MESSAGES: Record<Locale, MessageTable> = { en, "zh-CN": zhCN };

type Params = Record<string, string | number>;

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`));
}

export function translate(locale: Locale, key: string, params?: Params): string {
  const table = MESSAGES[locale] ?? MESSAGES.en;
  const text = table[key] ?? MESSAGES.en[key] ?? key;
  return interpolate(text, params);
}

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh")) return "zh-CN";
  return "en";
}

export function applyDocumentLang(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "zh-CN" ? "zh-CN" : "en";
}

const README_EN = `# Welcome to Boke

Boke is a personal knowledge manager. Your notes and drawings live as plain files in a folder you control.

## Get started

1. Click **New note** in the sidebar to write Markdown.
2. Click **New drawing** to create an Excalidraw canvas.
3. Organize files and folders in the file tree on the left.

## Your data

- Notes are \`.md\` files; drawings are \`.excalidraw\` files.
- Pasted images are saved next to each note in a \`{NoteName}_pic/\` folder.
- The vault path in the toolbar shows where files are stored.

Start writing your first note here.
`;

const README_ZH = `# 欢迎使用 Boke

Boke 是一款面向个人的知识管理应用，笔记与绘图都以普通文件保存在你指定的文件夹中。

## 快速开始

1. 在左侧点击 **新建笔记**，写下第一篇 Markdown。
2. 点击 **新建绘图**，创建 Excalidraw 画板。
3. 在文件树中整理文件夹与文件。

## 关于你的数据

- 笔记为 \`.md\` 文件，绘图为 \`.excalidraw\` 文件。
- 粘贴的图片保存在笔记旁的 \`{笔记名}_pic/\` 文件夹中。
- 顶部工具栏显示当前知识库路径。

从这里开始，写下属于你的第一条笔记吧。
`;

export function getDefaultReadmeContent(locale: Locale): string {
  return locale === "zh-CN" ? README_ZH : README_EN;
}
