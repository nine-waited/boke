export const DEFAULT_README_PATH = "README.md";

export const DEFAULT_README_CONTENT = `# 欢迎使用 Boke

Boke 是一款面向个人的知识管理应用，帮你把笔记、想法和图解整理在同一处，数据始终保存在你自己的文件夹里。

## Boke 能为你做什么

- **写下来**：用 Markdown 记录文字，格式简洁，随时可编辑
- **画出来**：用 Excalidraw 手绘示意图、流程图和草图
- **找得到**：全文搜索与双向链接，帮你把零散内容串成体系
- **管得住**：笔记以普通文件保存，可用网盘、Git 或备份工具自行同步

## 快速开始

1. 在左侧点击 **新建笔记**，写下第一篇 Markdown
2. 点击 **新建绘图**，创建一张 Excalidraw 画板
3. 在左侧文件栏中整理文件夹，像管理普通文档一样管理你的知识库

## 关于你的数据

- 笔记保存为 \`.md\` 文件，绘图保存为 \`.excalidraw\` 文件
- 顶部显示的路径是当前库存储位置，点击可修改
- 需要多设备协作时，可在 **设置** 中配置云端存储

从这里开始，写下属于你的第一条笔记吧。
`;

export async function ensureDefaultReadme(
  exists: (path: string) => Promise<boolean>,
  write: (path: string, content: string) => Promise<void>,
): Promise<boolean> {
  if (await exists(DEFAULT_README_PATH)) return false;
  await write(DEFAULT_README_PATH, DEFAULT_README_CONTENT);
  return true;
}
