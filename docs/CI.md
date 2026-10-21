# CI：从推送到桌面上的 exe

目标：开发者只 `git push`，之后的检查、交叉编译、Windows 实机测试、把 exe 放到 Windows 桌面都自动完成，**不需要有人在 Windows 那台电脑上动手**。

```
开发（ssh AI 上写代码、提交）
  │ git push main
  ▼
GitHub（公开仓库 orangepro2001/AFVI_UI）
  ▲ 每分钟 fetch
构建服务器 ssh AI   scripts/build.sh：gofmt、vet、go test、绑定、pnpm check、交叉编译 exe、打包 Windows 测试二进制
  │ 发布候选预发布 ci-<短提交>（exe + SHA256SUMS.txt + wintests.tar.gz），用个人令牌
  ▼ release 事件
GitHub Actions  windows-latest（.github/workflows/windows.yml）
  │ test     校验 SHA-256 → Windows 上跑 Go 测试 → 启动 exe：窗口标题、存活、截图
  │ promote  全部通过后，用测过的 exe 替换滚动预发布 nightly，删除候选
  ▼
nightly 预发布 ← Windows 电脑上的计划任务 AFVI-UI-Sync 每 5 分钟读一次 SHA256SUMS.txt
                  → 下载、校验、放到桌面、删旧版
```

## 为什么这样分

- **服务器构建**：缓存是热的，检查加交叉编译约 30–80 秒；`scripts/build.sh` 在本地、服务器上是同一个脚本，本地能过服务器就能过。
- **GitHub 只做必须在真 Windows 上做的事**：Go 测试在 Windows 原生运行（路径、UNC、`%AppData%`），并真的启动 exe。测试用的是服务器交叉编译好的二进制，Windows 机器**不装 Go、不编译**，只下载几十 MB 就跑。
- **公开仓库的 Actions 免费**，不需要自己的 Windows 机器，也不需要在自己的电脑上开任何入站端口。
- **桌面同步是拉取式**：Windows 电脑主动读公开的 nightly（一个普通文件地址，没有令牌、没有 API 限流），所以服务器、开发者都够不到这台电脑也没关系。

## 保证

- **nightly 里只有通过 Windows 测试的 exe。** 测试失败时 nightly 不变，桌面不会收到没测过的版本；失败的候选 `ci-<短提交>` 保留 7 天，可以手动下载排查。
- **只发布最新的 main。** promote 时 main 已经前进，这个候选就丢弃，等更新的那个。
- **版本号是干净的**：main 构建是短提交号（如 `c79d31b`），`v*` 标签构建是标签名；写进窗口标题和文件名。
- **`v*` 标签**：服务器照旧直接发布正式 Release（不带测试包），发布后 Actions 补测一遍，结果只作提示，不拦截。
- 构建失败时提交旁边是红色的 `afvi-ui-ci/server` 状态；Windows 测试在提交的 Checks 里是 `windows / test`、`windows / promote`。

时间线（**预估，首次在 GitHub 上跑完后用实测值替换**）：服务器轮询最多 1 分钟 + 构建 30–80 秒 + 上传 10 秒 + GitHub 的 Windows 机器启动和测试 1–2 分钟 + 桌面轮询最多 5 分钟 ≈ 推送后 4–9 分钟 exe 出现在桌面。

## 文件

| 文件 | 作用 |
| --- | --- |
| `scripts/build.sh`、`scripts/wintests.sh` | 检查、交叉编译、打包 Windows 测试二进制（`dist/AFVI-UI-<版本>-wintests.tar.gz`） |
| `deploy/server/ci` | 服务器驱动：构建并发布候选 `ci-<短提交>`（先建草稿、传完文件再公开，这个“公开”才触发 Actions）；`v*` 标签发布 Release。细节见 [SERVER_CI.md](SERVER_CI.md) |
| `.github/workflows/windows.yml` | Windows 门禁：`test` 与 `promote` 两个 job |
| `scripts/ci/verify-sums.ps1` | 按 `SHA256SUMS.txt` 校验 |
| `scripts/ci/run-wintests.ps1` | 解包测试二进制，在各自的包目录里运行（读 `testdata/`），日志 `wintests.log` |
| `scripts/ci/smoke.ps1` | 启动 exe，等窗口标题 `Pixel Inspector ( Version : <版本> - AFVI )`，确认存活 15 秒，截屏；只结束自己启动的那个进程。`-InstallWebView2` 在镜像缺运行时才安装 |
| `scripts/desktop-sync/sync.ps1`、`install.ps1` | Windows 电脑上的桌面同步及其计划任务安装器 |
| `scripts/ciwait.go` | 推送后等流水线走完，读公开 API（见下） |
| `deploy/server/mock-github.go` | 模拟 GitHub API，用来离线演练 `ci` |

## 桌面同步（在 Windows 电脑上装一次）

`sync.ps1` 每次运行：读 `releases/download/nightly/SHA256SUMS.txt` → 桌面上没有那个 exe 就下载到 `<名>.part`、校验 SHA-256 后改名 → 删除桌面上更旧的 `AFVI-UI-*-windows-amd64.exe`。**只碰这个文件名模式**，`AFVI-Teach-Setup-*`、快捷方式等一概不碰；旧版正在运行就保留，下一轮（它关闭后）再删。nightly 正在被替换（几秒内没有这个发布）不算错误。日志在 `%LOCALAPPDATA%\AFVI-UI-Sync\sync.log`。

```powershell
# 在 Windows 上：任选其一。会注册计划任务 AFVI-UI-Sync（当前用户，无需管理员；登录时和每 5 分钟运行，隐藏窗口）
irm https://raw.githubusercontent.com/orangepro2001/AFVI_UI/main/scripts/desktop-sync/install.ps1 | iex
.\install.ps1                  # 已有仓库副本时；-DryRun 只打印不注册，-IntervalMinutes 改间隔
.\install.ps1 -Uninstall       # 删除计划任务和安装的文件（桌面上的 exe 保留）

Start-ScheduledTask -TaskName AFVI-UI-Sync   # 立刻同步一次
Get-Content $env:LOCALAPPDATA\AFVI-UI-Sync\sync.log -Tail 20
```

更新同步脚本：再运行一次 `install.ps1`。

## 日常

```bash
git push                                  # 之后什么都不用做
go run scripts/ciwait.go                  # 想看进度：等到 nightly 指向这个提交（服务器 → windows test → promote → nightly），失败时说明在哪一步
go run scripts/ciwait.go -sha <提交>      # 指定提交
ssh AI '~/ci/afvi-ui/bin/ci status'       # 服务器侧的构建状态
```

- **重新测试某个发布**：GitHub → Actions → windows → Run workflow，填 `nightly`、`ci-<短提交>` 或 `v1.2.3`。手动运行不会 promote。
- **立刻要一个还没测完（或没测过）的 exe**：到 Releases 页面下载候选 `ci-<短提交>` 里的 exe（预发布，公开）。
- **强制重建并重新发布 main**：`ssh AI '~/ci/afvi-ui/bin/ci build main --force'`，候选会被重建，Windows 测试重新跑。
- 不要手工往 `nightly` 传文件：它只由 `promote` 写；候选 `ci-*` 只由服务器写。

## 排错

| 现象 | 看哪里 |
| --- | --- |
| 推送后迟迟没有候选 | 服务器：`ci status` 与 `journalctl --user -u afvi-ui-ci`；`ciwait` 里 build server 一栏 |
| 有候选但没有 Actions 运行 | 候选必须由**个人令牌**创建（`GITHUB_TOKEN` 创建的发布不会触发工作流）；仓库 Settings → Actions 是否启用；运行是否在 Actions 页被取消 |
| `windows / test` 失败 | 运行页的 Summary（Go 测试表、冒烟日志）和 artifact `windows-test-<标签>`（`smoke.png`、`smoke.log`、`wintests.log`）。冒烟失败先看截图和 `WebView2 runtime` 一行 |
| `windows / promote` 失败 | 日志最后几行；候选还在，修好后在 Actions 里 Re-run jobs 即可 |
| 提交测过但 nightly 没更新 | 日志里写 `main moved on`：main 又前进了，更新的提交会自己走完流水线 |
| 桌面没有新 exe | `sync.log`；`Get-ScheduledTask AFVI-UI-Sync`；先看 nightly 是否已经是这个提交（`ciwait`）；旧版正在运行时新版仍会下载，只是旧版留着 |
| 桌面上有两个 exe | 旧的在运行，关掉后下一轮会删 |

## 改动流水线之后怎么测

不碰 GitHub 就能演练服务器那一半：

1. 测试仓库：在临时目录用 `git ls-files -co --exclude-standard` 的内容（排除 `design/repo/`）建一个本地仓库并提交。
2. `go run deploy/server/mock-github.go -addr 127.0.0.1:8098 -data <目录>` 起模拟 API（它记录哪个发布被公开，即会触发工作流的事件；`GET /_state` 看全部状态）。
3. 临时的 CI 目录（放在磁盘上，不要放 `/tmp`：它是内存盘，装不下 Go 构建缓存），然后：

```bash
export AFVI_CI_HOME=<临时目录> AFVI_CI_CLONE_URL=<测试仓库> AFVI_CI_API=http://127.0.0.1:8098 AFVI_CI_UPLOADS=http://127.0.0.1:8098 GITHUB_TOKEN=x
deploy/server/ci build main      # 应当：草稿 → 3 个文件 → 公开 → 一个 release published ci-<短提交> 事件
deploy/server/ci publish main    # 再发布一次：旧发布和遗留草稿被清掉，只剩一个
deploy/server/ci build v0.0.1    # 标签：草稿 → 2 个文件（没有测试包）→ 公开，标签本身从不被删
```

4. 把模拟 API 里的三个文件取出来，在 Windows 上跑 `verify-sums.ps1`、`run-wintests.ps1`、`smoke.ps1`（它们在 PowerShell 5.1 和 7 上都能运行）。
5. `promote` 的脚本可以用一个只记录调用的假 `gh` 在本地跑（见这次的做法：从 `windows.yml` 抽出 `run:` 块执行）。

## 待在 GitHub 上首次运行后确认

这些在本机无法证实，第一次运行后据实更新本文：

- windows-latest 能否弹出窗口、截屏（`smoke.ps1 -RequireWindow` 失败时看 `smoke.log`）；镜像里有没有 WebView2 运行时（没有时 `-InstallWebView2` 会装）。
- 整条流水线的实测耗时。
- `GITHUB_TOKEN` 的 `contents: write` 能否在这个仓库里替换 nightly（仓库 Settings → Actions → General → Workflow permissions 不应限制它）。
