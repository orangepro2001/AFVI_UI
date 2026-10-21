# AFVI UI：给 AI 助手的工程约定

Wails v2（Go）+ Vue 3 + TypeScript + Tailwind v4 独立可执行文件 + shadcn-vue 的桌面界面。侧重 UI，设计图要 1:1 还原。总览见 [README.md](README.md)。

## 铁律

- **颜色只写在主题里。** 组件和页面不许出现 `#fff`、`rgb()`、`hsl()`、`oklch()`，也不许用 `text-red-500` 这类调色板类名（调色板已关闭，这些类根本不存在）。要新颜色：先在 `frontend/src/styles/themes/afvi-dark.css` 加变量，再在 `theme.css` 的 `@theme inline` 里命名，然后用 `bg-xxx` / `text-xxx`。`tests/theme-contract.test.ts` 会拦住违规。
- **尺寸用设计常量。** 字号用 `text-2xs…xl`，外壳尺寸用 `h-header`、`h-nav`、`w-rail`、`w-aside`。像素微调写任意值（`w-[123px]`）是允许的，但重复出现就该提成 `theme.css` 里的常量。
- **页面不碰 Wails，也不碰模拟数据。** 只通过 `useApi()` 拿 `ApiClient`。新增数据：先改 `api/types.ts` 和 `api/client.ts`，再让 `api/mock` 能回答，最后 Go 实现并在 `api/wails.ts` 接上。
- **`src/components/ui` 是 shadcn-vue 生成的源码。** 用 `scripts/ui-add.sh <组件>` 添加，不要手工 `pnpm dlx shadcn-vue`（corepack 与 pnpm 12 不兼容，脚本已处理）。ESLint 忽略这个目录。
- **不要改 Go 导出方法后忘记生成绑定。** 改了 `app.go` 的导出方法就跑 `scripts/bindings.sh`，`build.sh` 会检查绑定是否最新。

## 常用命令

```bash
scripts/tools.sh                      # 一次性：Tailwind 独立可执行文件
cd frontend && pnpm install && pnpm dev
cd frontend && pnpm check             # 类型、ESLint、Prettier、Vitest
./scripts/build.sh                    # 全套检查 + 交叉编译 Windows exe
scripts/snap.sh --route /teach --query freeze   # 无头 Chrome 截图（需 dev server 在跑）
go run scripts/diffgrid.go ours.png ref.png dx dy 40 [x y w h]   # 与设计图的差异热力图
scripts/bindings.sh [--check]
go run scripts/ciwait.go [-sha <提交>]   # 推送后等流水线走完：服务器构建 → Windows 测试 → nightly（读公开 API，不要令牌）
go run scripts/devapi.go [-config <文件>]   # 开发用：让浏览器里的前端读 Go 后端（?api=http://127.0.0.1:8099）；主机路径在 Connector 对话框里配
```

## 约定

- Go 里用 `command gofmt`：用户的 shell 把 `gofmt` 别名成会改文件的 `gofumpt`。`build.sh` 用的是 `gofmt -l`。
- 路径、版本、哈希固定在 `scripts/tools.env`、`frontend/package.json`、`go.mod`，改版本时同时更新对应的 `docs/PACKAGES.md` 说明。
- TypeScript 固定 6.0.3：vue-tsc 3.3.13 在 TypeScript 7 上会崩溃，升级前先验证 `pnpm typecheck`。
- 界面设计基线：视口 1778×929（设计图的尺寸）。截图用 `scripts/snap.sh --query 'freeze'`（默认就是 1778×929），叠加比对要带每张图的 dx/dy（`design/README.md`），差异用 `go run scripts/diffgrid.go` 量化。每页的尺寸在 `design/spec/`。
- 窗口比 1778×929 大时，每个元素保持设计图里贴着的那条边（工具栏与绘图工具列贴右，右栏面板铺满高度、底部按钮贴底），设计尺寸下必须逐像素不变。规则见 `design/spec/00-frame.md`。
- 文档用中文。提交信息前缀 `AFVI_UI: `。
- 不要 `git add -A`，不要 amend/reset；提交和推送需要用户明确授权当次任务。

## 发布流水线

推送 `main` 后全自动：服务器（`ssh AI`）构建并发布候选 `ci-<短提交>` → GitHub 的 Windows 机器测试 → 通过才替换 `nightly` → Windows 电脑上的计划任务 `AFVI-UI-Sync` 把 exe 放到桌面（并删旧版）。细节与排错见 [docs/CI.md](docs/CI.md)。

- `nightly` 只由 `.github/workflows/windows.yml` 的 `promote` 写，候选 `ci-*` 只由服务器写；不要手工往里传文件、不要在这两个标签上打别的东西。
- 版本号只认 `v*` 标签（`git describe --match 'v*'`）；不要建别的、会被当成版本的标签。
- 改了 `windows.yml`、`scripts/ci/*`、`scripts/desktop-sync/*` 或 `deploy/server/ci` 要照 CI.md“改动流水线之后怎么测”走一遍；改 `deploy/server/ci` 后还要 `deploy/server/install.sh` 部署到服务器。
- 桌面同步只删 `AFVI-UI-*-windows-amd64.exe`，正在运行的旧版留着，下一轮再删。

## 加一个页面

1. `frontend/src/pages/XxxPage.vue`（占位页用 `PlaceholderPage`）。
2. 在 `frontend/src/router/routes.ts` 加一条记录，带 `meta: { tab: 'XXX' }`，顶部页签自动出现。
3. 页面专属的面板放 `frontend/src/features/xxx/`，通用部件放 `components/app/`。
4. 需要的数据先进 `ApiClient`（见上）。
5. 跑 `pnpm check`，用 `scripts/snap.sh --route /xxx` 对照设计图。

更多细节：[docs/FRONTEND.md](docs/FRONTEND.md)、[docs/UI_WORKFLOW.md](docs/UI_WORKFLOW.md)。
