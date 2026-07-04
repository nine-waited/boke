# Git Sync — 补充参考

## Stash：暂存本地改动再 pull

本地有未提交修改，但用户要先拉远程、暂不提交：

```powershell
git stash push -m "wip before sync"
git pull origin main
git stash pop
```

`stash pop` 冲突时手动解决，再 `git add` / `git commit`。

## 查看与远程的差异

```powershell
git fetch origin
git log --oneline main..origin/main   # 远程有、本地没有
git log --oneline origin/main..main   # 本地有、远程没有
git diff origin/main...main
```

## 撤销误 add（未 commit）

```powershell
git restore --staged <file>
git restore <file>
```

## 已 commit 未 push 的撤回

**不要**对已 push 的 commit 用 reset 除非用户明确要求。

仅本地、未 push：

```powershell
git reset --soft HEAD~1   # 保留改动在暂存区
```

## 不要提交的路径

除 `.gitignore` 外，特别注意：

- `node_modules/`
- `apps/desktop/dist/`
- `server/.env`
- `*.local`

提交前 `git status` 确认无上述文件。

## 多机器协作建议

1. 开始工作前：`git pull origin main`
2. 结束或分享前：`git add` → `git commit` → `git pull` → `git push`
3. 避免长时间在 `main` 上堆积未 push 的大改动

## Force push（极少使用）

仅当用户**明确**要求用本地覆盖远程 `main`：

```powershell
git push --force origin main
```

执行前必须警告：会覆盖远程他人提交，可能丢失历史。

## SSH 远程（可选）

若用户已配置 SSH，可改用：

```
git@github.com:nine-waited/ChestnutEditor.git
```

```powershell
git remote set-url origin git@github.com:nine-waited/ChestnutEditor.git
```

不要未经用户同意切换 remote URL。
