# 前端架构

目标：页面很多、设计图要 1:1、主题和接口要先于页面稳定下来。所以结构上把“取值、命名、使用”三层拆开，把“界面”和“后端”隔开。

## 分层

```
styles/themes/afvi-dark.css   颜色取值（唯一写原始颜色的地方）
styles/theme.css              Tailwind 能认的名字 + 与主题无关的设计常量（字号、字体、外壳尺寸）
styles/base.css               全局基础样式
        ↓ 用 bg-card、text-label、h-header …
components/ui/                shadcn-vue 生成的基础控件
components/app/               项目通用部件：AppPanel、DataGrid、LegendList、StatusBlocks…
components/charts/            LineChart、RingGauge
features/<页面>/              页面里的面板，只拼装部件、读 store
pages/                        路由页面：布局 + 面板
layouts/                      应用外壳：AppShell、AppHeader、AppNav、SideRail
        ↓ 只依赖
api/                          ApiClient 接口 + 模拟后端 + Wails 适配器
stores/                       Pinia：app（应用信息、时钟）、machine（设备数据）、workbench（四个工作台页共用的条带与工具栏）、teach / review / calibration / settings（各页右侧栏）
```

依赖方向只能向下：页面不直接 import `wailsjs`，部件不直接 import store，`api/types.ts` 不 import 任何 Vue 东西。

## 主题

### 三个文件各管什么

- `themes/afvi-dark.css`：每个颜色令牌的值，写在 `:root, [data-theme='afvi-dark']` 下。令牌按用途分组：shadcn 基础名（`--background`、`--card`、`--primary`…）、外壳（`--header`、`--nav`、`--rail`、`--ready`、`--title`、`--label`、`--value`、`--positive`、`--notice`…）、表格与控制台（`--grid*`、`--log*`）、工位状态（`--work-*`）、光源通道（`--light-*`）、检查类型（`--kind-*`）、图表（`--chart-*`、`--gauge-*`）。
- `theme.css`：
  - `@theme { … }`：静态常量。`--color-*: initial` 关闭了默认调色板，只留 `white`/`black`；字号表 `2xs(11px)、xs(12)、sm(13)、base(14)、md(16)、lg(18)、xl(20)`，各带行高；字体 Segoe UI / Malgun Gothic；外壳尺寸 `--spacing-header: 58px`、`nav: 56px`、`rail: 57px`、`aside: 503px`、`gap: 5px`，对应 `h-header`、`h-nav`、`w-rail`、`w-aside`。
  - `@theme inline { --color-card: var(--card); … }`：把令牌命名成工具类。`inline` 让工具类在使用处读取变量，所以切换 `[data-theme]` 不需要重新生成 CSS。
- `base.css`：桌面应用的元素默认值：默认边框色、窗口本身不滚动、文字不可选（输入框和带 `data-selectable` 的元素除外）、按钮用默认光标、WebView2（Chromium）滚动条的外观。组件自己的样式写在组件里。

### 加一个颜色

1. 在 `themes/afvi-dark.css` 加 `--my-color: #xxxxxx;`（以及以后每个主题文件里都要加）。
2. 在 `theme.css` 的 `@theme inline` 里加 `--color-my-color: var(--my-color);`。
3. 使用：`bg-my-color`、`text-my-color`、`border-my-color`。

`tests/theme-contract.test.ts` 保证：所有主题声明同一组令牌；`theme.css` 只引用已声明的令牌，且每个令牌都被用到；`src` 里（除 `components/ui`、主题文件、测试）没有十六进制/rgb/hsl/oklch 颜色，也没有 `text-red-500` 这样的调色板类。

### 加一个主题

复制 `afvi-dark.css` 为 `themes/<名字>.css`，选择器改成 `[data-theme='<名字>']`，改值，在 `styles/index.css` 里 `@import` 它。切换：`document.documentElement.dataset.theme = '<名字>'`。契约测试会在令牌不齐时失败。深色主题保持 `<html class="dark">`（shadcn 的 `dark:` 变体依赖它）；浅色主题要去掉这个类。

## API 层（前端优先的核心）

`api/client.ts` 里的 `ApiClient` 是界面对后端的**全部**需求：

```ts
interface ApiClient {
  getAppInfo(): Promise<AppInfo>
  getHomeSnapshot(): Promise<HomeSnapshot>
  getWorkbench(): Promise<WorkbenchSnapshot>   // 条带图、缩略图、单元格图、读数
  getTeach(): Promise<TeachSnapshot>           // Unit / Dummy 规格树
  getDefects(): Promise<DefectRow[]>           // REVIEW 缺陷表
  getCalibration(): Promise<CalibrationSnapshot> // CALIBRATE 光源图与 20 个通道
  getSettings(): Promise<SettingsSnapshot>     // SETTINGS 掩膜、检测光源、对位光源
  onSystemStats(listener): Unsubscribe   // 约每秒推送
  onLog(listener): Unsubscribe
  toggleFullscreen(): Promise<void>
}
```

数据类型在 `api/types.ts`，是将来 Go 要实现的契约。

- `api/mock/`：带种子的模拟后端（`data.ts` 造数据，`index.ts` 让图表和日志动起来）。浏览器里全部由它回答。
- `api/wails.ts`：只包含 Go 已经实现的方法（现在是 `getAppInfo`，以及用 Wails 运行时实现的全屏切换）。
- `api/index.ts` 的 `createApi()`：浏览器里是模拟后端；Wails 窗口里是 `{ ...mock, ...wails }`，也就是 Go 实现了的用 Go，其余仍用模拟。这样可以逐个方法迁移，窗口里的界面始终是完整的。
- 页面用 `useApi()`（`provide/inject`）取客户端，测试里可以直接注入假实现。

### 把一个方法迁到 Go

1. 在 `app.go` 给 `App` 加导出方法，返回的结构体字段用 `json` 标签，与 `api/types.ts` 对齐。
2. `scripts/bindings.sh` 生成 `frontend/wailsjs`（要入库）。
3. 在 `api/wails.ts` 里加上这个方法，调用生成的函数。
4. 推送型数据（`onSystemStats`、`onLog`）在 Go 里用 `runtime.EventsEmit`，前端在适配器里用 `EventsOn` 并返回取消订阅函数。
5. Go 侧写测试（`app_test.go` 风格）；前端的模拟保留，作为浏览器开发和单元测试的数据源。

## 路由与页面

- `router/routes.ts` 是页面表。每条记录 `meta.tab` 有值就会出现在顶部页签，顺序即表的顺序；页面组件是懒加载的。
- hash 路由（`createWebHashHistory`）：Wails 从内嵌资源加载，没有服务器做回退。
- 五个页面都已按设计图实现。HOME 是自己的布局；TEACH、REVIEW、CALIBRATE、SETTINGS 共用 `layouts/WorkbenchLayout.vue`（信息条、工具栏、缩略图、条带查看器、读数条、日志），只有右侧栏（`#aside` 槽）不同：`features/teach/TeachPanel`、`features/review/ReviewPanel`、`features/calibrate/CalibratePanel`、`features/settings/SettingsPanel`。查看器上的工具面板和 ROI/标尺叠加物是 `features/workbench/ViewerTools`、`ViewerOverlay`（TEACH 页的 `#tools`、`#overlay` 槽）。
- 占位页 `PlaceholderPage` 留给以后的新页面。

### 加一个页面

1. `pages/XxxPage.vue`：只负责布局，面板放 `features/xxx/`。
2. `routes.ts` 加记录并设置 `meta.tab`。
3. 页面需要的数据：先加到 `ApiClient`，模拟后端能回答，再写面板。
4. 页面里的纯逻辑（行数据组装、几何计算）拆成 `.ts` 文件并写 Vitest 测试，如 `features/home/inspection-rows.ts`、`components/charts/geometry.ts`。

### 窗口比设计大时

设计基准是 1778×929，窗口更大时多出的空间由主区域吸收。每个元素保持它在设计图里贴着的那条边，清单见 `design/spec/00-frame.md` 的“窗口比设计基准大时（锚定规则）”。三种常用写法：

**贴右（内层 `ml-auto` 固定宽度组）**：flex 里空间不够时自动向右溢出，不会盖住左边。

```vue
<template>
  <div class="flex min-w-0 flex-1">
    <div class="relative mr-[4px] ml-auto h-full w-[661px] shrink-0">
      <!-- 图标组内容 -->
    </div>
  </div>
</template>
```

**贴右（绝对定位列容器）**：内部坐标相对该容器，用 `right-0` 贴右边。

```vue
<template>
  <div class="absolute inset-y-0 right-0 w-[73px]">
    <!-- 按钮中心 17/55，相对这 73px 容器 -->
  </div>
</template>
```

**铺满高度**：用 `top-[Npx] bottom-[Mpx] h-auto`，`h-auto` 通过 tailwind-merge 覆盖组件根默认的 `h-full`/`h-[Npx]`。

```vue
<template>
  <div class="absolute top-[312px] bottom-[12px] h-auto">
    <!-- 吃掉多出的高度 -->
  </div>
</template>
```

## 通用部件（`components/app`）

| 部件 | 用途 |
| --- | --- |
| `AppPanel` | 面板外框，`variant="section"`（页面区块，标题 16px 粗体，内边距 15px）或 `"widget"`（监控小块，标题 11px，内边距 8px），用 cva 定义 |
| `DataGrid` | 表格：列定义见 `types.ts`，行/列计算在 `data-grid.ts`（有单元测试），外观由 `--grid*` 令牌决定 |
| `StatusBlocks` | 工位进度方块（none/work/error/complete 四态） |
| `LegendList`、`SegmentBar`、`StatLine`、`PagerBar` | 图例、分段条、统计行、分页条 |
| `ScrollBar` | 方头滚动条（轨道、两端箭头、深色滑块）：只负责画，滚动由使用者做、把滑块位置传进来；无头 Chrome 不画原生滚动条，所以树和表格的滚动条都用它 |
| `ToggleSwitch` | 药丸开关，`variant` 为 `big`（校准页总开关）、`small`（表格行）、`mask`（设置页掩膜）；`role="switch"`，`v-model` |
| `MaskSlider` | 0..1 的双色滑块（左红右绿、金色圆钮、数值与刻度），指针与键盘（±0.01、Home/End）可操作 |
| `AppDialog` | Win32 风格的模态对话框壳（reka-ui Dialog）：40% 遮罩、2px 边框、18px 标题栏、固定 440×292；`[data-autofocus]` 的第一个元素在打开时拿到焦点 |
| `PlainDialog` | 原生 Windows 外观的模态对话框壳（253×302，黑标题条，无遮罩变暗），Generate Option 用 |
| `DialogButton` | 93×22 的对话框按钮，`primary` 是默认按钮（边框较亮），悬停变 `bg-dialog-button-hover` |
| `LoadingOverlay` | 窗口级的透明加载遮罩：14 个圆点转圈加 “Please wait...”，由 `app.busy` 驱动 |
| `LogConsole` | 日志控制台：跟随最新一行，操作员上滚去看旧日志时停止跟随；`notice` 级别的行用 `text-notice` |

`components/charts`：`LineChart`（折线加面积，坐标计算在 `geometry.ts`）、`RingGauge`（环形仪表）。图表的颜色全部来自 `--chart-*`/`--gauge-*`。

## shadcn-vue

- 配置是 `components.json`：new-york 风格，Tailwind 配置文件为空（v4 不需要），CSS 入口 `src/styles/index.css`。
- 用 `scripts/ui-add.sh button dialog …` 添加组件（脚本固定了 CLI 版本 2.8.2，并绕开 corepack 与 pnpm 12 的不兼容）。它会改 `package.json` 和锁文件，一起提交。
- 组件源码从那一刻起属于本项目，可以直接改。ESLint 忽略这个目录；组件内部可以用 shadcn 的令牌名（`bg-primary`、`border-input`…），这些名字都在主题里有定义。
- 已有：button、input、label、checkbox、switch、select、tabs、tooltip、dialog、scroll-area、separator。
- 图标用 `@lucide/vue`。设计图里的图标和 lucide 不一致时，把 SVG 放到 `src/assets/icons/` 并做成组件，不要在模板里内联长路径。

## 设计叠加（仅开发）

`?design=reference/home.png&blend=difference&opacity=0.5` 会把 `design/` 下的设计图 1:1 盖在界面上。它只在 `import.meta.env.DEV` 下动态加载，生产包里没有。用法见 [UI_WORKFLOW.md](UI_WORKFLOW.md)。

## 测试

- 单元测试放在被测文件旁边（`*.test.ts`），跨文件的契约放 `frontend/tests/`。
- 组件测试用 `@vue/test-utils` + happy-dom（参见 `DataGrid.test.ts`）。
- 选中节点相关：`stores/teach.ts` 的 `select(id)` 决定查看器模式（`strip` / `align` / `blank`）和分析表（`getNodeAnalysis`，失败时表清空）；`stores/workbench.ts` 的 `toolsLocked` 在非 `strip` 模式锁住工具栏，`pointerSeen` 控制 Align 读数栏是否出现。
- 左侧 rail 的对话框（Login / Choose Model Names / Load grab images / Generate Option）和加载遮罩是**窗口级**的：挂在 `layouts/AppShell.vue`，状态在 `stores/app.ts`（`loginOpen`、`modelOpen`、`grabOpen`、`generateOpen`、`busy` 与 `runBusy(ms)`），任何页面点 rail 都会触发。新加 rail 动作：在 `AppShell.vue` 的 `onRailSelect` 里加一个 case，对话框放 `features/dialogs/`。
- 模拟后端提供 `live: false` 选项，让数据停在种子上，测试结果稳定。
