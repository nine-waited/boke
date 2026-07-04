---
name: start-desktop
description: >-
  Start or build the Chestnut desktop app (Tauri). Use immediately when the user says
  启动项目, 启动桌面版, 帮我以exe的方式启动, exe启动, 桌面版, 开一下应用,
  pnpm dev — execute without asking for confirmation.
---

# 启动 Chestnut 桌面版

用户要启动/编译桌面版时，**直接执行**，不要反复确认。

## 项目信息

| 项 | 值 |
|---|---|
| 仓库根 | 含 `package.json` 的项目根目录（建议目录名 `chestnut/`） |
| 开发启动 | `pnpm dev`（Tauri dev，MSVC 目标） |
| 打包 exe | `pnpm build:desktop` |
| 前端 dev 端口 | 1420（仅 Tauri 内嵌，不是给用户开的网站） |
| 成功标志 | 弹出 **Chestnut Editor** 窗口 |
| 存储 | 本地文件夹 + 可配置 REST 云端 |

## 前置条件（Windows，首次或失败时核对）

| 组件 | 说明 |
|---|---|
| Node.js 20+、pnpm 9+ | 单独安装，**不要**在 VS 安装器里勾 Node |
| Rust（rustup） | `rustc --version` |
| **VS Build Tools 2022** | 勾选 **「使用 C++ 的桌面开发」**（含 MSVC + Windows SDK） |
| **开发人员模式** | 设置 → 隐私和安全性 → 面向开发人员 → 开启 |
| 智能应用控制 | 建议 **关闭**，否则 Rust `build-script-build.exe` 会被拦（error 4551） |
| Tauri 图标 | 首次构建前在 `apps/desktop` 执行一次 `pnpm tauri icon public/favicon.svg` |

不需要：浏览器版、Node.js（在 VS 组件里）、完整 Visual Studio IDE。

## 执行步骤

### 1. 检查是否已在运行

查看 Cursor `terminals` 目录，或 1420 端口：

```powershell
Get-NetTCPConnection -LocalPort 1420 -State Listen -ErrorAction SilentlyContinue
```

已有 `tauri dev` / 窗口已开 → 告知用户即可，**不要重复启动**。

若 1420 被僵死进程占用：

```powershell
Get-NetTCPConnection -LocalPort 1420 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
```

### 2. 刷新 PATH（PowerShell 找不到 node/pnpm/rust 时）

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + "$env:USERPROFILE\.cargo\bin"
```

依赖缺失：`cd <repo-root>; pnpm install`

### 3. 启动（必须用 MSVC 环境 + MSVC 目标）

**关键经验**：本机若装过 LLVM-MinGW，Tauri 可能误用 `x86_64-pc-windows-gnu` 导致链接失败。必须：

1. 在 **vcvars64** 环境里编译（否则找不到 `link.exe`）
2. 显式指定 **`-t x86_64-pc-windows-msvc`**

在仓库根目录 **后台**运行（`block_until_ms: 0`）：

```powershell
cmd /c "`"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat`" && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && cd /d <repo-root> && pnpm dev"
```

`pnpm dev` 已配置为 `tauri dev -t x86_64-pc-windows-msvc`。若 VS 不在默认路径，用 `vswhere` 或用户实际 `vcvars64.bat` 路径。

PowerShell 用 `;` 连接命令，不要用 `&&`（除非在 `cmd /c` 内）。

### 4. 等待就绪

轮询终端直到出现：

```
Running `target\debug\Chestnut.exe`
```

或进程持续运行且无报错。首次全量编译约 **3～10 分钟**；超时 10 分钟再报错。

### 5. 回复用户

> 桌面版已启动，请查看弹出的 Chestnut 窗口。

## 常见错误与处理

| 现象 | 原因 | 处理 |
|---|---|---|
| `link.exe` not found | 未在 MSVC 环境中编译 | 用 `vcvars64.bat` 再跑 `pnpm dev` |
| `应用程序控制策略已阻止` (4551) | 智能应用控制 / WDAC | 开开发人员模式、关智能应用控制，必要时给 `target` 加 Defender 排除 |
| `icons/icon.ico` not found | 未生成图标 | `cd apps/desktop; pnpm tauri icon public/favicon.svg` |
| `x86_64-w64-mingw32-gcc` / `-lgcc` | 误用 GNU 工具链 | `cargo clean` 后加 `-t x86_64-pc-windows-msvc` 重编 |
| Port 1420 already in use | 旧 Vite 未退出 | 结束占用 1420 的进程后重试 |
| 只有浏览器能开 1420 | Tauri 未编过 | 这是前端预览，不是桌面版；继续修 MSVC/权限问题 |

GNU 工具链清理（误编后）：

```powershell
cmd /c "`"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat`" && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && cd /d <repo-root>\apps\desktop\src-tauri && cargo clean"
rustup default stable-x86_64-pc-windows-msvc
```

## 打包 exe（仅用户明确要求「打包」「release」时）

```powershell
cmd /c "`"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat`" && set PATH=%USERPROFILE%\.cargo\bin;%PATH% && cd /d <repo-root> && pnpm build:desktop"
```

产物：

- `apps/desktop/src-tauri/target/release/Chestnut.exe`
- 安装包：`apps/desktop/src-tauri/target/release/bundle/`

## 不要做的事

- 不要启动已删除的 Web PWA（`apps/web` 不存在）
- 不要为了启动而随意 kill 无关进程
- 不要修改 git 状态（除非用户要求）
- 不要把 `http://localhost:1420` 当作「桌面版已就绪」—— 必须看到原生窗口
