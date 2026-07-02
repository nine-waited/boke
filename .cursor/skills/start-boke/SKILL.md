---
name: start-boke
description: >-
  Start the Boke desktop app (Tauri). Use immediately when the user says
  启动项目, 帮我以exe的方式启动, 桌面版, 开一下应用 — execute without asking.
---

# 启动 Boke 桌面版

用户要启动 Boke 时，**直接执行**，不要反复确认。

## 执行步骤

### 1. 检查是否已在运行

查看 Cursor `terminals` 目录，搜索含 `tauri dev` / `Running` 的会话；已运行则告知用户即可。

### 2. 环境准备（仅失败时）

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + "$env:USERPROFILE\.cargo\bin"
```

依赖未安装：`cd <repo-root>; pnpm install`

Rust / MSVC 缺失时告知安装 [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)。

### 3. 启动

在仓库根目录后台运行：

```powershell
cd <repo-root>; pnpm dev
```

- `block_until_ms: 0`（后台）
- PowerShell 用 `;` 连接命令

### 4. 等待就绪

轮询直到 Tauri 编译完成、应用窗口弹出。首次 Rust 编译可能数分钟。

### 5. 回复用户

> 桌面版已启动，请查看弹出的 Boke 窗口。

## 打包 exe（仅用户明确要求时）

```powershell
cd <repo-root>; pnpm build:desktop
```

产物：`apps/desktop/src-tauri/target/release/boke.exe`

## 项目信息

| 项 | 值 |
|---|---|
| 命令 | `pnpm dev` |
| 技术栈 | Tauri 2 + `@boke/desktop` |
| 存储 | 本地文件夹 + 可配置 REST 云端 |
