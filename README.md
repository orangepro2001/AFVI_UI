# AFVI UI

Pixel Vision Inspection System 的桌面界面工程。**前端优先**：先在浏览器里用模拟数据把界面做到与设计图 1:1，Go 后端以后按同一份接口契约逐个方法接上。

| 层 | 选型 |
| --- | --- |
| 桌面壳 | Go 1.27 + [Wails v2](https://wails.io)（v2.17.0，固定为 `go tool wails`），目标平台 Windows amd64，在 Linux/WSL2 交叉编译 |
| 前端 | Vite 8 + Vue 3.5 + TypeScript 6 + Pinia + Vue Router（hash 路由） |
| 组件 | [shadcn-vue](https://www.shadcn-vue.com)（new-york，基于 reka-ui），源码在 `frontend/src/components/ui`，属于本项目 |
| 样式 | Tailwind CSS v4 **独立可执行文件**（不使用 npm 版 Tailwind），主题全部抽成 CSS 变量 |
| 包管理 | pnpm 12（精确版本、24 小时冷却、provenance 检查），Node 由 pnpm 自己下载并锁版本 |
| 测试 | Vitest + happy-dom，ESLint 10、Prettier、vue-tsc |
| 发布 | 推送到 `main` 后，构建服务器（`ssh AI`）构建，GitHub 的 Windows 机器测试通过后刷新 `nightly` 预发布，Windows 电脑上的计划任务把 exe 放到桌面（[docs/CI.md](docs/CI.md)）；打 `v*` 标签发布正式 Release |

## 快速开始

需要：Linux/WSL2、Go 1.27、`curl`、`git`。**不需要**安装 Node、Tailwind，也不需要 MinGW（Windows 可执行文件无 cgo，纯 Go 交叉编译）。

```bash
scripts/tools.sh                 # 下载并校验 Tailwind 独立可执行文件（以及没有 pnpm 时的 pnpm）到 .tools/
cd frontend
pnpm install                     # 依赖，包含 pnpm 管理的 Node
pnpm dev                         # http://localhost:5173 ，使用模拟数据，Tailwind 随 Vite 监听
```

一键检查并构建 Windows 可执行文件：

```bash
./scripts/build.sh               # 产物：dist/AFVI-UI-<版本>-windows-amd64.exe + SHA256SUMS.txt
```

`wails dev` 需要 Linux 上的 GTK/WebKit，这里没有安装：界面在浏览器里用 `pnpm dev` 开发，在 Windows 上运行构建出的 exe 验证真实窗口。详见 [docs/BUILD.md](docs/BUILD.md)。

## 目录

```
main.go app.go           Wails 入口与绑定给前端的 Go 方法（App）
wails.json               Wails 工程配置
scripts/                 构建、工具下载、绑定生成、截图、shadcn-vue 组件添加；ci/ 是 GitHub Windows 机器上的测试脚本，desktop-sync/ 是桌面同步
.github/workflows/       windows.yml：Windows 实机测试并发布 nightly
deploy/server/           构建服务器的驱动脚本与 systemd 单元（ssh AI）、演练用的模拟 GitHub API
design/                  设计图（reference/）与截图（snap/，不入库）
docs/                    文档
frontend/                Vite + Vue 工程
  src/styles/            主题：themes/*.css（取值）→ theme.css（命名）→ base.css
  src/api/               ApiClient 接口、模拟后端、Wails 适配器
  src/layouts/           应用外壳：页头、页签、左侧图标栏
  src/pages/             每个路由一个页面
  src/features/<页面>/    页面专属的面板
  src/components/app/    项目自己的通用部件（面板、表格、图例、控制台…）
  src/components/ui/     shadcn-vue 组件
  src/components/charts/ 折线图、环形图
  wailsjs/               Wails 生成的绑定（入库，scripts/bindings.sh 重新生成）
  tests/                 跨文件的契约测试（主题、Tailwind 可执行文件查找）
```

## 文档

- [docs/FRONTEND.md](docs/FRONTEND.md)：前端架构、主题分层、API 层、如何加页面和组件
- [docs/UI_WORKFLOW.md](docs/UI_WORKFLOW.md)：拿到设计图后如何 1:1 还原（截图、叠加比对、取色）
- [docs/BUILD.md](docs/BUILD.md)：本地构建、检查项、版本号、Windows 运行要求
- [docs/CI.md](docs/CI.md)：从推送到桌面上的 exe：服务器构建、GitHub 的 Windows 测试、nightly、桌面同步
- [docs/SERVER_CI.md](docs/SERVER_CI.md)：构建服务器这一段：如何安装、令牌、排错、卸载
- [docs/PACKAGES.md](docs/PACKAGES.md)：依赖与供应链策略、为什么固定这些版本
- [design/README.md](design/README.md)：设计图放哪里、怎么命名
- [CLAUDE.md](CLAUDE.md)：给 AI 助手的工程约定

## 状态

- 首页（HOME）已按参考截图还原；TEACH / REVIEW / CALIBRATE / SETTINGS 是占位页，等设计图。
- 当前颜色与尺寸是对着聊天里的参考截图目测的；拿到原始设计图后用 `design/reference/` 和叠加比对工具校准到像素（见 [docs/UI_WORKFLOW.md](docs/UI_WORKFLOW.md)）。
- 应用图标仍是 Wails 默认图标，需要替换（见 [docs/BUILD.md](docs/BUILD.md)）。
- Go 端目前只实现 `GetAppInfo`；其余数据都由前端模拟后端提供。
