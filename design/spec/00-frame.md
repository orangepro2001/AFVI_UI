# 00 外壳与坐标约定（所有页面共用）

参考图在 `design/reference/`，都是约 1778×929 的窗口截图。**设计基准视口 = 1778×929**（`scripts/snap.sh --size 1778x929`）。
窗口在 1920×1080 最大化时视口更大，多出的空间由主区域伸缩吸收；外壳尺寸与字号不变。

## 各参考图的截图偏移（叠加比对用）

截图时顶部多裁了几个像素，所以各图要平移才能与基准重合。下表是“图中坐标 − 设计坐标”：

| 参考图 | dx | dy | 备注 |
| --- | --- | --- | --- |
| home.png | 0 | 0 | 基准 |
| settings.png | 0 | 0 | |
| teach.png | 0 | 3 | |
| calibrate.png | 1 | 3 | |
| top-toolbar-ruler.png | 0 | 1 | |
| top-toolbar-gv.png | 2 | 6 | |
| review.png | 0 | 8 | 底部带 Windows 任务栏，忽略 |

本文所有坐标已换算成设计坐标（`y_设计 = y_图 − dy`）。叠加：`?design=reference/teach.png&dx=0&dy=3&blend=difference&opacity=1`
（`dx`/`dy` 是图要向左上移动多少像素：图往 (−dx, −dy) 平移后与基准重合）。

## 颜色与尺寸一律走令牌

颜色全在 `frontend/src/styles/themes/afvi-dark.css`（已按参考图采样）；`theme.css` 里有对应的工具类名：
`bg-card`（#2d2d2f，几乎所有面板）、`bg-background`（#252527，面板之间的缝）、`bg-muted`（#36353a，查看器/日志/规格树的凹槽底）、
`bg-sheet-head`（#363636）、`bg-sheet-row`（#303030）、`bg-ready`（#9acd32）、`bg-primary`（#0079ca）、
`text-title`、`text-label`、`text-value`、`text-subtle`、`text-sheet-muted`、`bg-tab-*`、`bg-spec-*`、`border-tool-*`、`bg-mask-*` 等。
**不要写十六进制颜色，不要用 `text-red-500` 这类调色板类**（主题契约测试会失败）。需要新颜色就停下来说明，不要自己加令牌。
外壳尺寸令牌：`h-header`(58) `h-nav`(56) `w-rail`(57) `w-aside`(503) `gap-gap`(5)；字号 `text-3xs`(10) `text-2xs`(11) `text-xs`(12) `text-sm`(13) `text-base`(14) `text-md`(16) `text-lg`(18) `text-xl`(20)。其余像素值用任意值（`h-[33px]`）。

字体：Segoe UI / Malgun Gothic（已在 theme.css）。**Linux 截图时会回退到别的字体，宽度有差别，不要为了迁就回退字体去改字号。**

## 外壳（AppShell / AppHeader / AppNav / SideRail / StatusButton）

整体：`flex-col`，宽 100%，右侧留 3px 边（`pr-[3px]`，底色 background）。背景 `bg-background`。

- **页头** y 0..57（`h-header`），底色 card。
  - 左：标题 “Pixel Vision Inspection System - Master” x=10，文字中心 y≈16，17px，细体（font-light），`text-title`；副标题 “Provide high quality and high speed inspection machines” 中心 y≈39，10px，`text-subtle`。
  - 中：时钟，水平居中（x=889），两行：`오후 11:06:00`（10px，中心 y 19）、`2026-10-20 (화)`（中心 y 31），颜色 `text-foreground` 偏灰（#d3d3d3 可用 `text-foreground/90`）。
  - 右：用户块 “Admin” / “2026-10-20 16:35:23”，两行 10px，`text-subtle`（#686869），水平中心 x≈1428；五个图标中心 x=1555,1604,1652,1700,1749，y=28，约 24px，线宽 1.5，`text-icon-accent`。
- **页签行** y 58..113（`h-nav`），x 0..1268：五个等宽页签，间距约 3px（`gap-[3px]`），无左边距；
  文字 16px（`text-md`）大写居中；非活动 `bg-nav`，活动 `bg-primary text-primary-foreground`。
  **Ready 按钮** x 1271..1774，y 58..113（宽 `w-aside`，右侧 3px 边在外），`bg-ready`，文字 “Ready” 白色 17px 细体。
- **主体** y 114..925：
  - **左侧图标栏** x 0..56（`w-rail`），底色 rail(card)，12 个图标中心 x=29，y=146,200,251,302,354,406,458,510,562,614,666,718（间距约 52），图标约 30px，线宽 1.5，颜色 `text-foreground/85`；全屏图标中心 y=898。
  - 栏与内容之间 5px 缝（背景色），内容区 x 62..1266 宽 1205，再 5px 缝，右侧栏 x 1273..1775（`w-aside`）。
  - 内容区自上而下的 y：从 y=118 开始（页签行下 4px）。
- 路由出口 `<main>`：`flex-1 min-w-0 pl-gap pt-[4px] pb-[4px]`，由页面自己排版“左内容 + 右侧栏”。

## 窗口比设计基准大时（锚定规则）

设计尺寸是 1778×929，所有坐标都按它量。窗口更大（例如 1914×1010 的客户区）时，每个元素保持它在设计图里贴着的那条边：贴右的仍贴右、贴着顶/底边的仍贴着、需要铺满高度的吃掉多出的高度。新增元素前先问“设计图里它贴哪条边”。设计尺寸下必须与改前逐像素一致。

| 元素 | 贴哪条边 | 做法 | 文件 |
| --- | --- | --- | --- |
| 顶部工具栏图标组 | 槽的右边，右留 4px | 根 `flex min-w-0 flex-1`；内层 `relative mr-[4px] ml-auto h-full w-[661px] shrink-0`；窗口更窄时向右溢出，不盖住左边 | `frontend/src/features/workbench/ToolButtons.vue` |
| 视口右侧绘图工具列 | 视口右边 | 根 `absolute inset-y-0 right-0 w-[73px]`，按钮中心 17/55（相对 73px 容器），右列按钮右边距视口右边 1.5px（设计视口宽 1059px） | `frontend/src/features/workbench/ViewerTools.vue` |
| TEACH 右栏 | 顶/底/右 | 根 `h-full`；规格面板与分析面板上沿 79px、下沿 `bottom-0`；规格树上沿 152px、`bottom-[3px]`，滚动条上下拉伸 | `frontend/src/features/teach/TeachPanel.vue` |
| REVIEW 右栏 | 顶/底/右 | 上面的表固定高，下面的深色块 `top-[486px] bottom-[3px]` 吃掉多出的高度 | `frontend/src/features/review/DefectTable.vue` |
| CALIBRATE 右栏 | 顶/底/右 | 校准表 `top-[312px] bottom-[12px] h-auto`；Auto/Reload/Save 三个按钮 `bottom-[3px]` | `frontend/src/features/calibrate/CalibratePanel.vue` |
| SETTINGS 右栏 | 顶（不变） | 自顶向下的表单，设计里下面本来就留白 | `frontend/src/features/settings/SettingsPanel.vue` |
| HOME | 铺满（不变） | 本来就铺满 | — |
| 左列缩略图与单元图 | 固定高（不变） | 高度固定 | — |
| 日志控制台 | 固定高 157px（不变） | 高度固定 | `components/app/LogConsole` |
| 条带查看器 | 吃掉多出的高度 | 视口吃掉多出的高度；条带图在视口里水平居中、顶距 15px | — |

写法要点：贴右可用“内层 `ml-auto` 固定宽度组”（flex 里空间不够时自动溢出，不会盖住左边）或“`absolute inset-y-0 right-0 w-[Npx]` 的列容器，内部坐标相对该容器”；铺满高度用 `top-[Npx] bottom-[Mpx] h-auto`（`h-auto` 通过 tailwind-merge 覆盖组件根默认的 `h-full`/`h-[Npx]`）。

## 日志控制台（所有页面左下角，`LogConsole`）

y 765..921（高 157），x 62..1266。外层 `bg-card` 顶部内边距 4px，内层 `bg-log`（#36353a）y 769..921，字号 `text-2xs`(11)，行高约 15.8px，
文字左内边距 6px：时间（如 `2026-10-20 19:54:06`）+ 空 6px + 内容。普通行颜色 `text-log-info`，`notice` 行偏黄（`text-notice`），
另有一类浅蓝行（`2026-10-20 22:54:06 KeepAlive IP:192.168.200.14, PORT2000` 显示为蓝 #3b79b7，较暗一行显示为灰，是“已选中/已读”态，数据里用 `level: 'info'|'notice'|'dim'|'select'` 区分——类型 `LogLevel` 要加 `'dim' | 'select'`）。
右侧滚动条 x 1248..1262：轨道 #444（`bg-input`），14px 宽，上下带小三角按钮；滚动条样式在 `base.css`，按参考图是方头滚动条。

## 日志内容（所有页面相同，初始 10 行，滚动到底；上面还有更早的行，第一行只露出一半）

| 时间 | 内容 | level |
| --- | --- | --- |
| 2026-10-20 17:23:38 | `[Module:I-Transfer] Image transfer complete[Strip:1, Count:66]` | notice |
| 2026-10-20 17:23:38 | `[MainFrame] CommandLocalTransferEnd.  Strip: 1  strPacket: \\192.168.200.10\PxTemporary^1^TEST3^1^0^0^1` | notice |
| 2026-10-20 19:54:06 | `KeepAlive  IP:192.168.200.14, PORT2000` | info |
| 2026-10-20 19:54:07 | `KeepAlive  IP:192.168.200.11, PORT2000` | info |
| 2026-10-20 19:54:07 | `KeepAlive  IP:192.168.200.12, PORT2000` | info |
| 2026-10-20 19:54:07 | `KeepAlive  IP:192.168.200.13, PORT2000` | info |
| 2026-10-20 22:54:06 | `KeepAlive  IP:192.168.200.14, PORT2000` | select（首页蓝色，其他页参考图里是灰 dim；用 select 即可） |
| 2026-10-20 22:54:07 | `KeepAlive  IP:192.168.200.11, PORT2000` | info |
| 2026-10-20 22:54:07 | `KeepAlive  IP:192.168.200.12, PORT2000` | info |
| 2026-10-20 22:54:08 | `KeepAlive  IP:192.168.200.13, PORT2000` | info |

模拟后端（`api/mock`）的初始日志就是这 10 行；实时追加仍是每 3 秒一条 KeepAlive（用当前时间）。URL 带 `?freeze` 时模拟后端不再产生数据（设计比对用）。
