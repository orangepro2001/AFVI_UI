# 30 TEACH 页（参考图 teach.png dy=3；right-block-1.png / right-block-2.png；top-toolbar-gv.png dx=2 dy=6；top-toolbar-ruler.png dy=1）

左侧是工作台（20-workbench.md）。本文件是右侧栏和查看器里的叠加物。坐标为设计坐标。

## 右侧栏 x 1271..1778（宽 507，比 Ready 按钮宽 4px，Image Analysis 页签一直到窗口右缘），y 118..925

整体分三段：顶部大页签（Specification / Image Analysis）、第二排页签行、下方内容。底色 `bg-muted`（#36353a）的是左半的规格区；右半的表格区底 `bg-sheet-row`（#303030）。

### A. 大页签 y 118..160（高 43）

`Specification`：x 1271..1523，`bg-tab-spec`；`Image Analysis`：x 1526..1778，`bg-tab-analysis`；文字 16px（`text-md`）居中，颜色 `text-tab-foreground`；
两页签之间有 2px 深色竖线（`bg-background`）；页签底边有 2px 稍深的色条。当前选中的是 Specification（Image Analysis 仍显示，内容是同一页下半的分析表，参考图里两者同时可见：Specification 是左半，Image Analysis 是右半）。

### B. 第二排页签 y 170..195（高 25）

按钮（粗体 10px，文字 `text-tab-foreground`，居中，底边 2px 深色条）：
`Unit` x 1275..1380（选中：`bg-tab-unit`；未选中 `bg-tab-dummy`）、`Dummy` x 1381..1488（选中 `bg-tab-unit`，未选中 `bg-tab-dummy`；right-block-2 是 Dummy 选中的状态）；
`Light-1` x 1492..1585、`Light-2` x 1587..1679（选中：`bg-tab-light-active`）、`Light-3` x 1680..1771；`Light-1/3` 底 `bg-tab-light`。
Unit/Dummy 切换规格树内容（`TeachSnapshot.unit/dummy`）。

### C. 左半：规格区 x 1275..1488（宽 214），y 197..925，底 `bg-muted`

1. “Global Align :” 标题条：x 1275..1469，y 200..215（高 15，`bg-sheet-line`，粗体 10px，白）。下面三行（10px，行高 16，中心 y=224,240,256）：`Light :`（x=1290，`text-sheet-muted`）、编号（x=1337，`text-foreground/85`）、`Channel :`（x=1365，`text-sheet-muted`）、通道名（x=1432，`text-foreground/85`）：(1,Red) (2,Red) (3,Green)。
2. “SR Align :” 标题条 y 265..281，一行 (1,Red) 中心 y=287。
3. “Overlay” 粗体 10px，x=1302 中心 y=314；下一行 y=333：四个复选项 `MK`（选中且灰）x=1290、`A_C` x=1340、`I_C` x=1388、`SK` x=1436，框 11×11，文字 `text-3xs` `text-sheet-muted`；
4. **规格树** x 1275..1475，y 349..925，右侧滚动条 x 1475..1487（轨道 `bg-card`，滑块 `bg-input`，滑块 x 1478..1485）。树项（`SpecChip`）高 19：
   - 根节点 `Align / ROI`：芯片 x 1303..1395（宽 92），y 355..374，`bg-spec-root`，文字 `text-tab-foreground` 粗体 10px；子项 `Metal`（gold）、`SR`（green，文字白）、`DMG`（silver）：芯片 x 1349..1442（宽 93），y=380,405,430（间距 25），树线 `stroke-spec-line` 1px，从根下 x=1318 竖线，横到 1349；这三个子项**无复选框**。
   - 分组节点（`AU`、`OSP`、`Drill`、`NonMetal`、`ETC`）：复选框 x 1286..1297（12×12，白色 1px 描边，选中显示对勾）+ 芯片 x 1303..1395；组芯片 y（AU 456、OSP 556、Drill 656、NonMetal 732）；
   - 子项：复选框 x 1332..1343 + 芯片 x 1349..1442，行距 25，第一子项在组下 25；树线：组下 x=1318 竖线，每个子项横线到复选框。
   - 色：AU、OSP、Drill 及其子项 gold（`bg-spec-gold`），NonMetal 及子项 green（`bg-spec-green`，文字白），ETC 及子项 violet（`bg-spec-violet`，文字白）。
   - 选中状态：参考图中 `OSP > L-Pad` 选中。

   Unit 的树（right-block-1）：Align / ROI [Metal, SR, DMG]；AU [C-Pad, B-Pad, L-Pad]；OSP [C-Pad, B-Pad, L-Pad✓]；Drill [Hole, Vent]；NonMetal [SR All, Pattern1, PatternThick, Space1, SpaceThick, Open1, EtchBack, Open2]；ETC [SR Shift, Barcode, User Mask]（窗口只露出前面一部分，树要能滚动到后面）。
   Dummy 的树（right-block-2，**没有 Align / ROI 根**，从 AU 开始）：AU [C-Pad, L-Pad]；Drill [Hole, Vent]；NonMetal [SR All, Pattern1, Space1, Open1, Open2]；ETC [SR Shift, Barcode, User Mask]。Dummy 状态下 Overlay 一行 y 不变，树从 y=272 起。
   Global Align / SR Align 两个状态相同。

### D. 右半：分析区 x 1492..1771，y 197..925，底 `bg-sheet-row`

随选中的 Light 页签显示三张表（参考图里 Light-2 选中、表都是空的）：
1. 表 1：表头行 y 199..213（`bg-sheet-head`，10px，`text-sheet-muted`）列 `No.`（中心 x 1511，宽 38）`Name`（中心 x 1603，宽 148）`Value`（中心 x 1715，余下宽），表头单元格之间有 1px 浅色分隔线；表体空，到 y≈368。
2. 表 2：同样的表头，y 371..385，表体空到 y≈540。
3. 通道页签 y 540..564：`Red`（x 1492..1585，`bg-tab-channel-red`，文字深色）`Green`（x 1586..1679，`bg-tab-channel`）`Blue`（x 1680..1771，`bg-tab-channel`），粗体 10px；下面表 3：表头 y 568..583 `No.` `Name` `Value` `Min`（4 列，Min 被裁掉一半），表体空到底。
4. 底部水平滚动条 y 909..922，x 1492..1771（轨道 `bg-card`，滑块 `bg-input`）。
数据类型 `AnalysisRow`，模拟数据可为空数组，但表格组件要能渲染行（`DataGrid` 或新表）。

## 查看器里的叠加物（teach 页，来自 top-toolbar-gv.png / top-toolbar-ruler.png）

> 注：工具面板的最终几何（78px 底条、30×30 按钮、20 个描出来的字形、只在 GV 工具选中或选中 Align 节点时显示）见 [50-teach-nodes.md](50-teach-nodes.md)，下面一节是早期在窄窗口下量的，仅作背景。

**工具面板** `components/workbench/ViewerTools.vue`：查看器右侧，x 1197..1262（相对查看器右缘内缩约 4px），按钮 33×33、圆角 8px、2px 边框（`tool-disabled`，选中 `tool-active`，可用的 `tool-border`），两列（x 中心 1211 与 1249），行（设计 y，gv 图 dy=6 已减）：
- y 186：单个按钮（选择/移动：lucide `MousePointer2`），仅一列（x 1211），可用（`tool-border`）。
- y 249：[实心矩形（选中，青色填充）][实心矩形（灰）]；y 286：[实心圆][圆+刷]；y 323：[圆形涂抹][多边形涂抹]（图标用 lucide：`Square`/`Circle`/`Lasso` 等，禁用态 `tool-disabled`；选中项 `tool-active`）。
- y 386：[`SquareDashed`][`SquareDashedMousePointer`]；y 423：[`CircleDashed`][`Hexagon`]；y 460：[`Lasso`][`Spline`]（全部禁用态）。
- y 524：[`Pipette`][`Pencil`]；y 587：[`Rows3`][`Columns3`]；y 650：单个 `Grid2x2Check`（x 1211）（禁用态）。
- y 708：[`Trash2`（可用，`tool-border`）][`Save`（禁用）]。
没有选中任何 A 组工具时，面板显示（参考图 teach.png 上它也在显示，所以总是显示）。

**ROI 示例**（top-toolbar-gv.png，GV 选中时）：红色矩形 x 595..748、y 290..395（`border-overlay-line` 1.5px），四角与上下左右中点 8 个手柄（直径 7，`bg-overlay-handle`，白色描边），矩形中央文字 “GV : 29”（`text-overlay-text`，10px）。以查看器内坐标定位，作为 `ViewerOverlay` 在 GV 选中时渲染。
**标尺示例**（top-toolbar-ruler.png，Ruler 选中时）：红色线段从 (598,266) 到 (753,347)（设计坐标；1px `bg-overlay-line`），两端手柄；端点标签 “(5086, 2032)”（右上，`text-overlay-text`）和 “(8590, 3836)”（右下），线段中点 “3941.12px”（`text-overlay-measure`）。
交互：可以先只做静态展示（选中工具时显示示例叠加物，状态来自 `stores/workbench.ts`），但组件要接受 props（起止点、读数），为以后拖拽留口。

## 文件所有权（本步骤）

新建：`features/teach/{TeachPanel,SpecTabs,SpecAlign,SpecTree,AnalysisPanel}.vue`、`components/workbench/{SpecChip,ViewerTools,ViewerOverlay}.vue`、`api/mock/teach.ts`（`createTeachSnapshot()`）、`stores/teach.ts`、测试；
修改：`api/client.ts`（`getTeach()`）、`api/mock/index.ts`、`pages/TeachPage.vue`、`features/workbench/StripViewer.vue`（只加挂载叠加物/工具面板的插槽用法，由 TeachPage 传入）。
