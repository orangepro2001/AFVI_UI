# 构建

## 需要什么

| 工具 | 说明 |
| --- | --- |
| Go 1.27 | `mise.toml` 里写了版本（`mise install`），也可以自己装 |
| `git`、`curl`、`sha256sum`、`bash` | Linux/WSL2 自带 |
| Tailwind CSS 独立可执行文件 | `scripts/tools.sh` 下载，版本和 SHA-256 固定在 `scripts/tools.env`，放在 `.tools/`（不入库） |
| pnpm 12.14.0 | PATH 上没有时 `scripts/tools.sh` 也会下载（构建服务器就是这样） |
| Node 24.22.0 | **不用自己装**。`frontend/package.json` 的 `devEngines.runtime` 让 pnpm 下载并锁定 |

不需要 MinGW、不需要 GTK/WebKit：Windows 目标无 cgo，Wails 用纯 Go 的 WebView2 加载器，直接在 Linux 交叉编译。

## 日常开发

```bash
scripts/tools.sh
cd frontend && pnpm install
pnpm dev            # 浏览器 http://localhost:5173 ，模拟数据
```

`pnpm dev` 会让自定义 Vite 插件（`frontend/tools/vite-plugin-tailwind-cli.ts`）先跑一遍 Tailwind，再启动监听子进程，输出 `src/styles/generated.css`（不入库）。Vite 退出时子进程跟着退出。Tailwind 可执行文件的查找顺序：环境变量 `TAILWINDCSS_BIN` → `$AFVI_TOOLS_DIR/bin` → `<仓库>/.tools/bin` → PATH。

在 Wails 窗口里看真实效果：构建 exe（下面）后在 Windows 上运行。`wails dev` 需要 Linux 的 GTK/WebKit，本工程没有装；界面是纯前端，浏览器里开发已经足够，Go 侧目前只有 `GetAppInfo`。

前端命令（都在 `frontend/` 下）：

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 开发服务器 |
| `pnpm build` | 生产构建到 `frontend/dist`（被 Go `embed`） |
| `pnpm typecheck` | `vue-tsc`，应用和 Node 配置各一遍 |
| `pnpm lint` | ESLint（flat config，忽略 `src/components/ui`、`wailsjs`） |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm test` / `pnpm test:watch` | Vitest |
| `pnpm check` | 类型 + lint + 格式 + 测试，等于 CI 的前端检查 |

## 一键构建 Windows 可执行文件

```bash
./scripts/build.sh [--version V] [--skip-checks] [--offline]
```

顺序：工具 → `gofmt -l` → `go vet` → `go test` → 绑定是否最新（`scripts/bindings.sh --check`）→ `pnpm install --frozen-lockfile` → `pnpm check` → `go tool wails build -platform windows/amd64 -clean -m -skipbindings -trimpath`。

产物：`dist/AFVI-UI-<版本>-windows-amd64.exe` 和 `dist/SHA256SUMS.txt`。约 12 MB，GUI 子系统，单文件。

- `--version`：写进窗口标题（`Pixel Inspector ( Version : <版本> - AFVI )`）和文件名，通过 `-ldflags "-X main.version=…"` 注入。默认取 `git describe`，没有 git 信息时是 `dev`。
- `--skip-checks`：只编译，本地快速重编用。构建服务器从不跳过。
- `--offline`：`GOPROXY=off` 加 `pnpm --offline`，需要缓存已经热了。

构建带 `-trimpath` 且没有时间戳：同一提交、同一版本号在同一台机器上重复构建得到字节相同的文件（服务器上已验证）。

构建服务器运行的就是这个脚本，所以本地能过的检查，服务器上也会过。

## Go 与 Wails

- `go.mod` 里 `tool github.com/wailsapp/wails/v2/cmd/wails`：用 `go tool wails …` 调用，版本跟着 `go.mod`，不需要全局安装。
- 给前端用的 Go 方法写成 `App`（`app.go`）的导出方法，然后 `scripts/bindings.sh` 生成 `frontend/wailsjs/`（入库）。`scripts/bindings.sh --check` 在不改动工作区的情况下检查是否最新。
- 前端怎么接 Go 方法：`frontend/src/api/wails.ts`，见 [FRONTEND.md](FRONTEND.md) 的“API 层”。

## 运行要求（Windows）

- Windows 10 1809 及以上、amd64。
- **WebView2 运行时**：Windows 11 自带；Windows 10 需要安装 Evergreen Runtime（本机已验证 155 版可用）。缺失时 Wails 会提示并给下载链接。
- 可执行文件没有代码签名，SmartScreen 可能提示。

## 应用图标

`build/appicon.png` 和 `build/windows/icon.ico` 是 Wails 的默认图标，是占位。替换方法：把 1024×1024 的 PNG 放到 `build/appicon.png`，删除 `build/windows/icon.ico`，下次构建 Wails 会重新生成。`build/windows/info.json` 里是文件版本信息（公司、产品名等），按需修改。

## 常见问题

- **`no space left on device`（Go 链接时）**：`/tmp` 是内存盘且满了。给 Go 指定磁盘上的临时目录：`GOTMPDIR=$HOME/.cache/go-tmp ./scripts/build.sh`。
- **`gofmt` 把文件改了**：用户 shell 里 `gofmt` 是会写文件的 `gofumpt` 别名，手动格式化用 `command gofmt -l .`。
- **`vue-tsc` 崩溃**：别把 TypeScript 升到 7，见 [PACKAGES.md](PACKAGES.md)。
- **pnpm 拒绝安装刚发布的包**：`minimumReleaseAge` 是故意的，等 24 小时，或者只对确认过的包加 `minimumReleaseAgeExclude`。
