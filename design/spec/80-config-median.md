# 80 rail 的设置面板与 Median 对话框

来源（`design/reference/`）：`left-block-menu-setting[no.12 icon].png`（1779×933）、`left-block-menu-median-image[no. icon].png`（1776×932）。两张图恰好是在 CALIBRATE 页上截的，**与 CALIBRATE 无关，更与 HOME 无关**：和 [70-global-dialogs.md](70-global-dialogs.md) 一样，它们挂在 `layouts/AppShell.vue`（`<RouterView />` 旁边），状态在 `stores/app.ts`，在任何路由上都能由 rail 触发；开发预设 `?dialog=config`、`?dialog=median` 在任何 `--route` 上都有效。

## rail 与动作

| rail 图标（`layouts/navigation.ts` 的 id） | 动作 | 状态 |
| --- | --- | --- |
| 12 `tools`（扳手） | 设置面板（右缘整高的属性列表） | `app.configOpen` |
| 9 `layers`（叠层） | Median 对话框 | `app.medianOpen` |

**Median 的图标编号是推断的**：文件名里的编号是空的（`[no. icon]`）。第 8~11 个图标里“叠在一起的图像”最像 median（多张图取中值），所以先挂在第 9 个；改成别的图标只要换 `AppShell.vue` 里 `onRailSelect` 的一个 `case`。

## 截图偏移（图 − 设计）

| 参考图 | dx | dy | 备注 |
| --- | --- | --- | --- |
| setting | 3（右侧元素）~4（左侧） | 4~5 | 整窗有 40% `#353535` 遮罩（亮绿 `#9acd32` → `#739031`）；面板自己不变暗 |
| median | 2 | 4 | **没有**遮罩；窗口比我们窄 2px，所以居中的对话框实测 dx=1 |

整窗数值被字体与数据差异淹没（参考图字窄约 6%）。偏移是用对话框区域的局部差异搜索（±5）和 rail/标签栏的归一化互相关量出来的：Median 区域最优 (1, 4)，面板内容最优在 dx≈1~2。

## 设置面板（`features/dialogs/ConfigPanel.vue`）

像 Qt 的属性浏览器：`fixed` 贴在窗口右缘，整高，宽 `w-prop`（367px，`theme.css`）；左缘 1px `border-sheet-head`，底色 `bg-sheet-row`（`#303030`）。壳是 reka 的 Dialog：盖 `bg-dialog-veil/40` 遮罩，点遮罩或 Esc 关闭（编辑中的第一次 Esc 只放弃编辑）。以下坐标以面板左上角为原点（参考图 x − 1415，y 不变；参考图的顶端就是面板顶端）：

- 工具条：「分类」按钮 `(7, 3)` 19×19，按下时 `bg-prop-tool-on`（`#181818`）；「A-Z」按钮 `(28, 3)` 19×19，A 蓝 `prop-sort-a`、Z 紫 `prop-sort-z`、箭头灰；搜索框 `left 53, top 1, right 2, h 23`，2px `border-sheet-line`，占位 “Search” `text-muted-foreground`，右端放大镜 `text-prop-search`。**参考图在右缘被截断**（放大镜只露出左半），我们画完整的。
- 列表区：`top 27` 到 `bottom 46`，行高 `h-prop-row`（17.657px：设计跑在缩放过的 DPI 上，36 行从 y≈27.2 到 y≈662.8；第一行 “Language” 中心 y=36，最后一行 “Camera Userset” 中心 y=654），超出时纵向滚动。字号 `text-2xs`，颜色 `text-foreground`。
- 标题行（粗体）：文字 `left 20`；折叠箭头 8×8 在 `left 5`，展开时是实心右下三角（`fill-prop-arrow`，`#636160`），折叠时是空心右三角；点整行折叠/展开。
- 值行：名字 `left 20`（宽到 191），值 `left 191`；开关（`ToggleSwitch` 的 `prop` 变体：28×12，关时 `bg-switch-off` + 7px 旋钮 `bg-switch-off-knob`，开时 `bg-primary`）在 `left 190`，右边是 “Off”/“On”。
- 底部：`bottom 45` 有 1px 分隔线 `bg-prop-split`（`#656565`），下面 45px 是说明区（参考图里是空的，我们也留空）。

数据：`ApiClient.getConfig(): Promise<ConfigGroup[]>`（`api/mock/config.ts`，7 组 29 行，36 行含标题，值逐字取自参考图；`choice` 行的可选项是猜的，参考图只显示当前值）。`stores/config.ts` 只请求一次，持有可编辑的值；**目前没有任何东西把值写回 Go 端**，等后端有“保存配置”再接。

行为（参考图只有静态画面，下面是推断）：

- 搜索：按名字或值过滤（不分大小写），没有命中的组整组隐藏，标题命中则显示整组，搜索时忽略折叠（`config-rows.ts`）。
- A-Z 按钮：去掉标题，所有行按名字排序；分类按钮回到分组视图。
- 点值进入编辑：文本/数字行出现输入框（Enter 或失焦提交；数字行输入的不是数字就保留旧值），`choice` 行出现下拉；开关点一下就翻转。每次打开面板清空搜索框。

## Median 对话框（`features/dialogs/MedianDialog.vue`）

Win32 原生外观，和 Generate Option 同一族配色（`plain-title`、`plain-body`、`plain-text`），**不变暗**，但透明遮罩挡住点击，点外面不关闭。外框 480×594（含 1px `border-plain-frame` `#8c8c8c`），水平居中，垂直中心比窗口中心高 12.5px（`top-[calc(50%-12.5px)]`，929 高的窗口里正好落在整数像素；量到的是 12~13px）。以下坐标以内框（边框内侧）左上角为原点：

- 标题条：`h 28`，`bg-plain-title`；“Median” `text-3xs text-plain-text`，`left 10`、中心 y=17；关闭 ✕ 中心 `(462, 10)`，9px、描边 2.75（参考图里是粗体白色 ✕）。
- Light 复选框行（`PlainCheckbox`，11×11 的框 + 3px 间隔 + 标签）：框的 `left` 为 7 / 68 / 128 / 189，`top 34`。Light1 未选，Light2、Light3 已选，Light4 禁用（暗：`text-dialog-text-dim`，框 60%）。
- 单元格图面板：`left 7, top 56, 246 × 530`，`bg-muted`（`#36353a`）。里面 `left 20, top 11` 放一张 146×507 的 SVG：**6 列 × 32 行**，1px 线 `median-grid`（`#c9163c`），列距 145/6 ≈ 24.17，行距 506/32 ≈ 15.81（量到：x 线中心 678.5…823.5，y 线中心 227.5…733.5；和 Model 列表的行高 15.82 是同一个 Win32 行高）。参考图里没有选中的格子，所以默认全不选；选中的格子盖 `fill-median-grid/40`（推断）。
- 按钮：`Clear All` `(257, 56)` 105×37，`Select All` `(366, 56)` 106×37（它的边框更亮，`border-dialog-line`，Clear All 用 `border-dialog-line-dim`），底色 `bg-sheet-row`，文字 `text-2xs text-plain-text`；`SAVE` `(257, 548)` 215×38。
- `Select Random Units :` 复选框 `(258, 107)`；右边的数字框 `(399, 102)` 56×19，禁用时 `bg-secondary`（`#575757`）+ 暗字 “55”，启用时 `bg-dialog-field`，边框 `border-plain-field-line`（`#7d7d7d`）。

数据：`ApiClient.getMedianSetup(): Promise<MedianSetup>`（`api/mock/median.ts`：四个灯、6×32、随机数 55）。行为（推断）：每次打开重新取数并清空选择；点格子切换；Select All / Clear All；勾上 Select Random Units 后启用数字框，并立即随机选出那么多格（数字限制在 1..192，只能输数字；改数字再随机一次）；SAVE 发出 `save`（`{ lights, cells }`，灯的 id 与格子序号按行优先、从 0 起）并关闭，**暂时没人消费**（等 Go 端的 Median 计算）。

## 已知不确定项

1. Median 的触发图标（见上）；
2. 设置面板的右缘：参考图在 1779px 处截断，面板的真实宽度和放大镜的完整样子不知道；
3. 设置面板的关闭方式（点遮罩/Esc 是推断的）、值的编辑方式、`choice` 的选项；
4. Median 里选中格子的外观、随机选择的触发时机、SAVE 之后的行为；
5. 文字宽度与参考图不同（参考图字窄约 6%），所以值列的文字起点对不齐，行距和块位置对得上。
