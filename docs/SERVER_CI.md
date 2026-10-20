# 构建服务器：推送后自动发布 nightly

构建服务器是 `ssh AI`（用户 `tony`）。它**主动去拉** GitHub，不需要从外面连进来，也不需要在 GitHub 上配置 webhook 或 Actions：

```
git push → GitHub (orangepro2001/AFVI_UI, 公开仓库)
                 ↑ 每分钟 fetch
   服务器 systemd 用户定时器 → ci poll → scripts/build.sh → dist/AFVI-UI-<版本>-windows-amd64.exe
                 ↓ GitHub REST API（令牌）
   滚动预发布 "nightly"（main 的每个新提交）／ 标签 v* 对应的正式 Release
```

和同机的 AFVI_TEACH 的 CI 同一套思路，但目录、定时器、令牌各自独立（`~/ci/afvi-ui`，`afvi-ui-ci.timer`），互不影响。

## 行为

- **main 分支**：每个新的提交都会构建。成功后删除旧的 `nightly` Release 和标签，用新提交重新创建（预发布），上传 `AFVI-UI-<短提交>-windows-amd64.exe` 和 `SHA256SUMS.txt`。提交旁边会出现 `afvi-ui-ci/server` 状态（构建中 / 成功 / 失败）。
- **只发布最新的 main**：构建期间 main 又前进了，旧提交的构建不会发布（日志里是 `main moved on`），下一轮轮询直接构建新的。
- **`v*` 标签**：每个标签只构建一次，创建同名 Release（自动生成发布说明；标签里带 `-` 的，如 `v1.0.0-rc1`，标记为预发布）。标签视为不可变。
- **版本号**：main 构建为短提交号（如 `0d8d6d4`），标签构建为标签名；写进窗口标题和文件名。
- **失败**：构建失败不会碰现有的 nightly。失败的目标等 `RETRY_WAIT`（600 秒）后重试，最多 `RETRY_MAX`（3）次；新提交重新开始计数。发布（上传）失败单独重试，不会重新构建。
- **一次只跑一个**：`state/lock`。构建超过 `BUILD_TIMEOUT`（30 分钟）会被终止。
- **保留**：`out/main` 保留最新 10 个构建；标签构建永久保留。
- **检查**：服务器执行的就是 `scripts/build.sh`：gofmt、vet、测试、绑定、类型检查、ESLint、Prettier、Vitest 全过才会出 exe。所以推送一个没格式化的文件会得到失败状态，而不是一个坏的 nightly。

## 服务器上需要什么

`go`（1.27）、`git`、`jq`、`curl`、`flock`、`rsync`、`tar`、`column`、`sha256sum`，以及 systemd 用户会话（且 `loginctl enable-linger`，否则没人登录时定时器会停）。**不需要** Node、pnpm（构建时自动下载）、Tailwind、MinGW、NSIS。

## 安装（已在 AI 上完成）

在本机仓库根目录：

```bash
deploy/server/install.sh                 # 默认主机 AI，目录 ~/ci/afvi-ui，启用定时器
deploy/server/install.sh --no-enable     # 只安装不启动
deploy/server/install.sh --host OTHER --home /abs/path
```

可以重复运行（更新）：只替换 `bin/ci`、`README.txt` 和两个 systemd 单元，不碰 `etc/ci.conf`、令牌、构建结果和缓存。它做的事：

1. 检查服务器上的工具和 systemd 用户会话。
2. 建 `~/ci/afvi-ui/{bin,etc,out,work,state,cache}`，复制 `ci`；首次复制 `etc/ci.conf`。
3. 写 `~/.config/systemd/user/afvi-ui-ci.service` 和 `afvi-ui-ci.timer`，`daemon-reload`。
4. 对已有的 `v*` 标签执行 `ci baseline`（标记为已处理、不构建，避免第一次启动就把历史标签全建一遍）。空仓库时无事可做，会提示 `couldn't find remote ref refs/heads/main`，是正常的。
5. `systemctl --user enable --now afvi-ui-ci.timer`。

定时器每次运行结束 60 秒后再运行（`OnUnitInactiveSec=60s`），所以长时间构建不会和下一次轮询重叠。

## 设置令牌（只有你能做）

发布 Release 需要写权限，服务器的 `ci` 从 `~/ci/afvi-ui/etc/github-token`（权限 600）读令牌。创建一个**只给这个仓库**的细粒度令牌：

1. GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token。
2. Resource owner：`orangepro2001`；Repository access：**Only select repositories** → 只选 `AFVI_UI`（选 “Public repositories” 是只读，发布会失败）。
3. Repository permissions：**Contents: Read and write**（创建/删除 Release 与标签、上传文件）、**Commit statuses: Read and write**（提交旁的构建结果；没有它发布仍然可用）。其余全部 No access。
4. 设一个过期时间，并记下续期日期。
5. 在你自己的终端运行（会隐藏输入）：

```bash
ssh -t AI '~/ci/afvi-ui/bin/ci set-token'
```

脚本会真的探测权限：对一个不存在的标签发 DELETE（有 Contents 写权限返回 422，没有返回 403），对一个不存在的提交发状态（403 则只警告）。不要复制 AFVI_TEACH 那个令牌，各用各的，泄漏时影响面最小。

令牌只通过 curl 的配置管道传给 `curl`，不会出现在进程列表里；`ci` 不打印令牌。

## 日常操作

```bash
ssh AI '~/ci/afvi-ui/bin/ci status'                       # 令牌、定时器、已构建/已发布/失败的列表、磁盘
ssh AI 'journalctl --user -u afvi-ui-ci -n 50 --no-pager' # 最近几次运行
ssh AI 'systemctl --user list-timers afvi-ui-ci.timer'    # 下次运行时间
ssh AI '~/ci/afvi-ui/bin/ci build main --force'           # 立刻重建并发布 main（忽略重试上限）
ssh AI '~/ci/afvi-ui/bin/ci build main --no-publish'      # 只建不发布
ssh AI '~/ci/afvi-ui/bin/ci publish v1.2.0'               # 重新发布已构建的目标
ssh AI '~/ci/afvi-ui/bin/ci gc'                           # 清理旧构建和过期工作目录
ssh AI 'systemctl --user stop afvi-ui-ci.timer'           # 暂停自动构建（start 恢复）
```

构建产物在服务器 `~/ci/afvi-ui/out/main/<时间>-<提交>/` 和 `out/tags/<标签>/`，每个目录有 exe、`SHA256SUMS.txt`、完整 `build.log` 和 `meta.json`；`out/latest-main`、`out/latest-release` 是软链接。构建失败先看 `build.log`。

## 配置

`~/ci/afvi-ui/etc/ci.conf`（纯 shell 赋值，安装时从 `deploy/server/ci.conf.example` 复制一次，之后不会被覆盖）：`REPO`、`BRANCH`、`TAG_GLOB`、`KEEP_MAIN`、`BUILD_TIMEOUT`、`RETRY_MAX`、`RETRY_WAIT`。不放任何机密。

## 目录结构

```
~/ci/afvi-ui/
  bin/ci            驱动脚本
  etc/              ci.conf、github-token（600）
  src.git/          GitHub 仓库的裸镜像（只 fetch，可删，会重新克隆）
  work/             构建中的临时检出，结束即删
  out/              结果：main/、tags/、latest-main、latest-release
  cache/            Go 模块与构建缓存、pnpm 存储（含固定版本的 Node）、scripts/tools.sh 的工具、
                    xdg/（pnpm、vitest 的状态目录，被重定向到这里）
  state/lock        同时只运行一次
```

CI 写的所有东西都在 `~/ci/afvi-ui` 和两个 systemd 单元里：`ci` 把 `XDG_*_HOME` 和 pnpm 存储都指到了 `cache/` 下，不会在 `~/.local`、`~/.cache` 里留东西（测试时发现 pnpm 12 只认 `pnpm_config_store_dir`，已处理）。

## 卸载

```bash
ssh AI 'systemctl --user disable --now afvi-ui-ci.timer && rm -f ~/.config/systemd/user/afvi-ui-ci.{service,timer} && systemctl --user daemon-reload'
ssh AI 'chmod -R u+w ~/ci/afvi-ui && rm -rf ~/ci/afvi-ui'     # Go 模块缓存是只读的，所以要先 chmod
```

GitHub 上的令牌也要在 GitHub 上撤销。

## 测试方法（改了 `ci` 之后）

`ci` 的三个 URL 和家目录都可以用环境变量重定向，所以能在不碰 GitHub 的情况下完整演练：

| 变量 | 作用 |
| --- | --- |
| `AFVI_CI_HOME` | CI 目录（默认 `~/ci/afvi-ui`） |
| `AFVI_CI_CLONE_URL` | 源仓库地址，可以是本地路径 |
| `AFVI_CI_API`、`AFVI_CI_UPLOADS` | GitHub API 与上传地址，指向本地模拟服务 |
| `GITHUB_TOKEN` | 直接给令牌，不读文件 |

做法：在服务器的临时目录里建一个测试仓库（`git ls-files -co --exclude-standard` 的内容 + 一次本地提交），起一个实现 `releases`、`git/refs/tags`、`releases/{id}/assets`、`statuses` 的小模拟 API，把上面变量指过去，然后依次演练：首次构建并发布 nightly → 再次轮询无动作 → 新提交替换 nightly → 破坏 gofmt 的提交得到失败状态且不碰 nightly、不立即重试 → 新标签得到 Release。这套演练在初次部署时全部走过一遍（构建约 80 秒，缓存热了之后约 30 秒），演练结束后删除测试目录（同样要先 `chmod -R u+w`）。

## 排错

| 现象 | 看哪里 |
| --- | --- |
| 推送后没有 nightly | `ci status`：令牌是否 `MISSING`；定时器是否 `active`；`journalctl` 里有没有 `cannot fetch`（仓库还没有 `main` 或网络问题） |
| 状态是 `failed` | `out/main/<…>/build.log` 末尾；本地用同一个提交跑 `./scripts/build.sh` 复现 |
| `GitHub answered 403/404` | 令牌权限或过期：重新 `ci set-token` |
| 一直 `another run is in progress` | 正在构建；或上次被杀留下的锁——锁是 `flock`，进程结束就自动释放，不需要手动删 |
| 磁盘增长 | `cache/` 可以整个删（下次构建变慢）；`out/main` 自动保留 10 个 |
| nightly 的 exe 版本显示提交号 | 这是设计：窗口标题里 `Version : <短提交>` |
