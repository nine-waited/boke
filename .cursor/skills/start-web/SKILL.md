---
name: start-web
description: >-
  Start the Boke web dev server (Vite on port 5173). Use immediately when the
  user says 启动网站, 启动项目, 开一下网站, run the site, start dev server, or
  open localhost:5173 — execute without asking for confirmation.
---

# 启动 Boke 网站

用户说 **「启动网站」** 或类似表述时，**直接执行**，不要反复确认。

## 执行步骤

### 1. 检查是否已在运行

查看 Cursor `terminals` 目录，或检查 5173 端口：

```powershell
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object State, OwningProcess
```

若已有 Vite 在跑（输出含 `http://localhost:5173` 或端口处于 `Listen`），告知用户地址即可，**不要重复启动**。

### 2. 启动开发服务器

在 **仓库根目录**（含 `package.json` 的 `boke/`）后台运行：

```powershell
cd <repo-root>; pnpm dev
```

- 使用 Shell 工具的 **后台模式**（`block_until_ms: 0`）
- PowerShell 用 `;` 连接命令，不要用 `&&`
- 工作目录必须是 monorepo 根，不是 `apps/web`

### 3. 等待就绪

轮询终端输出，直到出现：

```
VITE ... ready
➜  Local:   http://localhost:5173/
```

通常几秒内完成；超时 30s 再报错。

### 4. 回复用户

一句话说明即可，例如：

> 网站已启动，请打开 http://localhost:5173/

## 首次运行（仅失败时）

若 `pnpm` 报依赖缺失：

```powershell
cd <repo-root>; pnpm install; pnpm dev
```

## 不要做的事

- 不要启动 `dev:desktop`（那是 Tauri 桌面版），除非用户明确要求桌面端
- 不要修改代码或 git 状态
- 不要为了启动网站而 kill 其他无关进程；仅当 5173 被**僵死**的旧 Vite 占用且新实例无法启动时再考虑结束该进程

## 项目信息

| 项 | 值 |
|---|---|
| 启动命令 | `pnpm dev` |
| 实际服务 | `@boke/web` → Vite |
| 地址 | http://localhost:5173/ |
| 备选脚本 | `scripts/start-web.bat`（Windows） |

## 桌面版（仅用户明确要求时）

```powershell
cd <repo-root>; pnpm dev:desktop
```
