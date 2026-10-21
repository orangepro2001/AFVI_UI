# 70 左侧菜单栏的全局对话框与加载遮罩

来源（`design/reference/`）：`left-block-model-select[no.4 icon].png`、`left-block-menu-image[no.5 icon].png`、`left-block-menu-Cam-Generate[no.6 icon].png`、`left-block-menu-Align[no.7 icon][this is a loading overlay].png`。登录对话框（no.2）见 [60-login.md](60-login.md)。

**它们不属于 HOME 页。** 参考图恰好是在 HOME 页上截的，但左侧 rail 在几乎任何页面都能点，点了就触发；loading 遮罩也是窗口级的。所以对话框和遮罩挂在 `layouts/AppShell.vue`（`<RouterView />` 旁边），状态在 `stores/app.ts`，与当前路由无关；开发预设 `?dialog=…` 在任何 `--route` 上都有效。

## rail 与动作

| rail 图标（`layouts/navigation.ts` 的 id） | 动作 | 状态 |
| --- | --- | --- |
| 2 `user` | Log in/out 对话框 | `app.loginOpen` |
| 4 `model` | Choose Model Names | `app.modelOpen` |
| 5 `images` | Load grab images | `app.grabOpen` |
| 6 `nodes` | Generate Option | `app.generateOpen` |
| 7 `layout` | Align：显示 “Please wait...” 遮罩（模拟机器 3 秒后完成） | `app.busy`、`app.runBusy(ms)` |
| 3 `share` | Connector：配置 FM1/FM2/BM 的数据文件夹并选当前主机（没有参考图，见 [95-connector.md](95-connector.md)） | `app.connectorOpen` |
| 1 `information`、其余 | 还没有参考图，暂无动作 | |

## 截图偏移（图 − 设计）

| 参考图 | dx | dy | 备注 |
| --- | --- | --- | --- |
| model-select | 2 | 2 | 有 40% `#353535` 遮罩 |
| menu-image | 2 | 22 | 截图顶部带 20px 的 Windows 标题栏；有同样的遮罩；对话框区 diffgrid 约 1.8 |
| Cam-Generate | 1 | 3 | **没有**遮罩（外观是原生 Windows 对话框） |
| Align（loading） | 5 | 3 | 没有遮罩 |

比对用 `scripts/snap.sh --route / --query 'dialog=model'` 等，再 `go run scripts/diffgrid.go ours.png ref.png dx dy 20 x y w h`（区域是我们这边的坐标）。整窗数值还带着 HOME 与参考图本身的差异，评价对话框要框出对话框区域。

## Choose Model Names / Load grab images（`AppDialog` 壳）

与登录框同一个壳：440×292，2px 蓝框 `border-dialog-border`，18px 标题条 `bg-dialog-title`，窗口居中，正文原点在标题条下、边框内。两者共用的几何（正文坐标）：

- 列表面板：`left 6, top 6, 424 × 225`（Model）或 `424 × 223`（Grab，底色 `bg-muted`，**空的**，没有任何占位文字）。
- 按钮：`Apply`/`Load` 在 `left 239`，`Cancel` 在 `left 338`，`top 243`，93×22（`DialogButton`；`Cancel` 是 `primary`）。`Apply`/`Load` 禁用时文字 `text-dialog-text-dim`。鼠标悬停时按钮底色变 `bg-dialog-button-hover`（Model 的参考图里 Cancel 正好在悬停态）。

Model 的列表面板（面板内坐标）：

| 部分 | 位置 | 说明 |
| --- | --- | --- |
| 标题条 | `top 0, h 18`，`bg-sheet-head` | “Product - Model”，左 5px |
| 横线 | `top 18, h 2` | `bg-dialog-list-rule` |
| 表头行 | `top 20, h 17, w 408`，`bg-sheet-head` | 列宽 56/111/112/36/93：Index、Creation Date/Time、Name 右对齐（右内边距 4），State、Resolution 居中；第 2 列起每列左边 1px 分隔线，数据行没有竖线 |
| 数据区 | `top 38, h 187, w 408`，`bg-dialog-list-body` | 行高 15.82；原生滚动条隐藏；选中行 `bg-dialog-border/45`（参考图里没有选中态，是推断的） |
| 滚动条 | `right 0, 15 × 225`，`ScrollBar` + `bg-dialog-scroll-track` | 参考图里滑块很短（约 15%），所以模拟数据有 64 个模型 |

数据：`ApiClient.getModels(): Promise<ModelEntry[]>`（`api/mock/models.ts`，前 12 条逐字取自参考图，其余确定性生成）。行为：每次打开重新取数并清空选中；单击选中行才能点 Apply；双击等于 Apply；Apply 发出 `apply`（载荷是 `ModelEntry`）并关闭。**目前没有任何东西消费 `apply`**——HOME 的 ModelBar 还是静态的，等 Go 后端有“切换模型”再接。

## Generate Option（`PlainDialog` 壳）

Win32 原生外观：253×302，没有蓝框、黑色标题条（`bg-plain-title`，29px）、正文 `bg-plain-body`，不变暗但透明遮罩挡住点击；水平居中，垂直中心比窗口中心高 11px（`top-[calc(50%-11px)]`，参考图如此）。原点是对话框左上角：

- 标题 “Generate Option”：`left 11`，中心 y 18，`text-3xs text-plain-title-text`；关闭 × 中心 `(236, 11)`。
- 两行说明（`text-2xs`，`left 22`，中心 y 67 与 103）；第一行 “- Are you sure you want to run CamGenerate?” 在 215px 处被截断，参考图里就是在 “CamGene” 处断开。
- `Light` 分组框 `left 17, top 138, 219 × 43`，圆角 4，`border-plain-line`；图例压在框线上。内部（控件 11×11，中心线 y=162）：All 复选框 `left 32`，`#1` 单选 `left 83`，`#2` `left 138`，`#3` `left 192`，标签在控件右边 3px。
- `Area` 分组框 `left 17, top 198, 219 × 44`；MT 复选框 `(32, 218)`，SR 复选框 `(188, 220)`。
- `OK`（`left 17`）和 `Cancel`（`left 166`）：`top 263`，70×21。
- 行为：默认 `#2`、MT、SR 选中；All 与 `#1..#3` 互斥（All 选中时三个单选都不亮，再点 All 回到上次的单选）；一个区域都没选时 OK 禁用；OK 发出 `confirm`（`{ light, mt, sr }`）并关闭，**暂时没人消费**（等 Go 端的 CamGenerate）；每次打开恢复默认值。

## Loading 遮罩（`components/app/LoadingOverlay.vue`）

全窗口透明遮罩（`fixed inset-0 z-[60] cursor-wait`，挡住所有点击，包括顶栏和 rail），不变暗。圆环中心在窗口中心上方 11px：14 个直径 17 的圆点，圆心距环心 58px，头部颜色 `bg-busy-dot`，尾部不透明度从 1 线性降到 0.15，整环用 `steps(14)` 的 CSS 动画顺时针转（1.4s 一圈，`prefers-reduced-motion` 下不转）。环心写 “Please wait...”（9.5px，`text-busy-text`，比环心高 2px）。参考图是一帧动画，头部在 10:30 位置，所以逐像素对不齐，圆环大小、位置、颜色对得上。

## 已知不确定项

1. 选中行的颜色、Apply 之后的行为、Generate 的真实执行都是推断的；
2. 点 Align 之后参考图里 HOME 的 WorkStatus 与日志也变了（Align 列变蓝、日志多两行 `[MenuBar] Manual Align…`），这是机器状态，不是遮罩的一部分，还没做；
3. 字体宽度与参考图不同（参考图字窄约 6%），所以表格文字的起点对不上，只有右对齐边缘对得上；
4. 同时点开两个对话框的情况：模态遮罩会挡住 rail，所以只有开发预设能同时打开；
5. Generate 对话框的垂直居中 −11px 和 Align 遮罩的 −11px 是量出来的，原应用里它们相对哪个容器居中不清楚。
