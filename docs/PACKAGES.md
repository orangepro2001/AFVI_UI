# 依赖与供应链

原则：**能不引入 npm 包就不引入；引入的都用 pnpm 精确锁定并设门槛。** Tailwind 是独立可执行文件，Node 由 pnpm 管，服务器上不需要预装任何前端工具。

## Tailwind CSS：独立可执行文件

- 版本和 SHA-256 固定在 `scripts/tools.env`（现为 4.3.3），`scripts/tools.sh` 下载并校验，不匹配就拒绝。放在 `.tools/bin/`（或 `$AFVI_TOOLS_DIR/bin`），不入库。
- 运行方式：`frontend/tools/vite-plugin-tailwind-cli.ts`。构建时一次性 `--minify`；开发时先编译一遍，再起 `--watch` 子进程，子进程的 stdin 连着管道，所以 Vite 退出时它一定退出（已验证没有孤儿进程）。
- 独立可执行文件解析 `@import 'tw-animate-css'` 时会到 `node_modules` 里找，所以 `tw-animate-css` 仍是一个 pnpm 依赖。
- 只扫描显式写出的 `@source`（`index.html` 和 `src/**/*.{vue,ts}`），生成结果不依赖 `.gitignore`。
- 升级：改 `scripts/tools.env` 里的版本和哈希（哈希从官方发布页的 `sha256sums.txt` 取，对照下载文件再算一遍），跑 `scripts/tools.sh --force`，再跑 `pnpm build`、`pnpm test`。

## pnpm 与 Node

- `frontend/package.json`：`packageManager: pnpm@12.14.0`，`devEngines.runtime` 为 Node 24.22.0（`onFail: download`）。pnpm 自己下载并校验 Node，锁在 `pnpm-lock.yaml` 里；装 pnpm 的人不用装 Node。
- 构建服务器只需要 pnpm 可执行文件，`scripts/tools.sh` 在 PATH 上没有 pnpm 时下载它。
- pnpm 的存储位置：本机默认；构建服务器上通过 `pnpm_config_store_dir` 指到 `~/ci/afvi-ui/cache/pnpm-store`（pnpm 12 只认 `pnpm_config_` 前缀，`npm_config_store_dir` 无效）。

## `pnpm-workspace.yaml` 的设置

| 设置 | 值 | 为什么 |
| --- | --- | --- |
| `savePrefix` | `''` | `package.json` 里写精确版本，写的是什么装的就是什么 |
| `minimumReleaseAge` | `1440` | 不安装发布不满 24 小时的版本，给恶意版本被撤回留出时间 |
| `minimumReleaseAgeStrict` | `true` | 不满足时失败，而不是悄悄选旧版 |
| `trustPolicy` | `no-downgrade` | 拒绝比此前版本“来源证明”更弱的发布（例如失去 provenance） |
| `trustPolicyExclude` | `semver@6.3.1` | shadcn-vue CLI 的依赖树里有这个 2022 年的老版本，没有 provenance，而更新的 semver 有，所以被规则误伤。只放行这个精确版本 |
| `allowBuilds` | `{}` | 安装脚本只对列入名单的包运行，目前没有 |

`pnpm install --frozen-lockfile`（CI 和 `wails.json` 都用）保证锁文件和 `package.json` 一致。

## 依赖清单与取舍

运行时：`vue`、`vue-router`、`pinia`、`reka-ui`（shadcn-vue 的无样式基础）、`@lucide/vue`（图标）、`@vueuse/core`、`class-variance-authority`（部件变体）、`cn`（`clsx` + `tailwind-merge` 的无依赖替代品，提供组件里用的 `cn()`）。

开发：`vite`、`@vitejs/plugin-vue`、`typescript`、`vue-tsc`、`vitest`、`happy-dom`、`@vue/test-utils`、`eslint`（及 `@eslint/js`、`typescript-eslint`、`eslint-plugin-vue`、`vue-eslint-parser`、`globals`）、`prettier`、`tw-animate-css`、`@types/node`。

- **TypeScript 固定 6.0.3**：vue-tsc 3.3.13 在 TypeScript 7.0.2 上直接崩溃（找不到 `./lib/tsc` 导出），已验证。vue-tsc 支持 TS 7 之后再升。
- **`class-variance-authority` 是手动加的**：shadcn-vue 的注册表组件用它但没有声明。
- **图表自己画**（`components/charts`，SVG）：几个折线和环形图，不值得引入图表库，也方便让颜色完全由主题控制。
- 没有 UI 框架之外的状态/请求库：`ApiClient` 加 Pinia 足够。

## 加依赖的流程

1. 先问是否真的需要（几十行能写出来的不引入）。
2. `cd frontend && pnpm add <包>`（精确版本）；开发依赖用 `-D`。
3. 看一眼发布时间和维护者；被冷却规则拦下就等，不要绕过。
4. 提交 `package.json` 和 `pnpm-lock.yaml`。
5. 更新这个文件的清单。

## shadcn-vue 组件

用 `scripts/ui-add.sh`，不要直接 `pnpm dlx shadcn-vue`。原因：CLI 内部通过 nypm 调 `corepack pnpm`，而 corepack 0.34 启动不了 pnpm 12。脚本在 `node_modules/.bin` 放一个会失败的 `corepack` 桩，让 nypm 退回到普通 `pnpm`；同时固定了 CLI 版本（2.8.2）。

## Go 依赖

只有 Wails v2.17.0 及其传递依赖。`go.mod` 里的 `tool` 指令让 `go tool wails` 用的是锁定的版本。改了依赖就 `go mod tidy` 并检查 `go mod tidy -diff` 无输出。
