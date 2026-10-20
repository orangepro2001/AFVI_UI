# 20 工作台（TEACH / REVIEW / CALIBRATE / SETTINGS 共用的左侧，加页面右侧栏插槽）

参考：`teach.png`(dy=3)、`calibrate.png`(dx=1 dy=3)、`settings.png`(dy=0)、`review.png`(dy=8)、`top-toolbar-gv.png`、`top-toolbar-ruler.png`。
以下坐标是设计坐标（已减 dy）。四个页面的左侧**完全相同**（只有查看器里的叠加物和读数不同），差别在右侧栏。

## 页面骨架 `layouts/WorkbenchLayout.vue`（新）

```
<WorkbenchLayout>
  <template #aside>…右侧栏内容…</template>
</WorkbenchLayout>
```
内容区（x 62..1266）自上而下：信息栏+工具栏（y 118..162，高 45）、缝 0（直接接）、主区（y 163..725，高 563）、统计栏（y 726..760，高 35）、缝 4、日志（y 765..921）。
右侧栏 x 1273..1775（`w-aside`）从 y=118 到 925（页签行下方整块，底色按各页面）。结构：`flex gap-gap`，左 `min-w-0 flex-1 flex-col`，右 `w-aside shrink-0`。

## 1. 信息栏 `features/workbench/InfoBar.vue`（x 62..1266，y 118..162，`bg-card`）

三组，每组左边一条 3px 宽、35px 高的 `bg-ready` 竖条（y 123..157），竖条 x=65 / 277 / 452，文字紧贴竖条右侧 6px：
- `MODEL :` 10px `text-ready`（中心 y=132）；值 `TEST1020-00` 17px 细体 `text-ready`（中心 y=147）。
- `LOT :` 10px；值 `TEST3` 13px 粗体，`text-ready`（中心 y=149）。
- `STRIP :` 10px；值 `1` 13px 粗体。
数据来自 `WorkbenchSnapshot.header`。

## 2. 工具栏 `features/workbench/ToolButtons.vue`（同一行 y 118..162，x 603..1266）

26×26 的圆角方按钮（圆角 6px，2px 边框 `border-tool-border`，底 `bg-card`），中心 y=138。按钮中心 x（共 20 个，4 组）：
- 组 A（11 个，工具）：615 648 679 711 742 774 805 837 868 900 931
- 组 B（2 个，视图）：974 1006
- 组 C（3 个，灯泡）：1048 1080 1111
- 组 D（4 个，通道）：1155 1187 1218 1250

图标 16px，颜色 `text-tool-icon`。lucide 图标（都已确认存在）：
A1 `Network`（**禁用**）、A2 `Ruler`（id `ruler`）、A3 文字 “GV”（粗体 11px，id `gv`）、A4 `QrCode`、A5 `Layers`、A6 `SlidersHorizontal`、A7 `SquareDashed`、A8 `Grip`（**禁用**）、A9 `Barcode`、A10 `Group`、A11 `LayoutGrid`；
B1 平行四边形（内联 SVG，描边）、B2 实心矩形（内联 SVG，18×11，选中时 `fill-tool-active`）；C1/C2/C3 `Lightbulb`（C2 点亮：黄色 `tool-yellow`，边框也黄）；
D1 红色实心圆点（`bg-tool-red`，边框 `border-tool-red`）、D2 空心，边框 `border-tool-green`、D3 空心，边框 `border-tool-blue`、D4 空心，边框 `border-tool-yellow`。

状态：
- 禁用：边框与图标 `tool-disabled`，不可点。
- 选中（A 组互斥，B2、C2、D1 在参考图中是选中的）：边框和图标 `tool-active`（青色），B2 的矩形填充 `tool-active`；C 组选中时灯泡/边框黄（`tool-yellow`）；D 组选中时圆点填充对应颜色（D1 红）。
- 参考图 teach 的初始状态：B2 选中、C2 点亮、D1 选中、A 组无选中；`top-toolbar-gv.png`：A3 选中；`top-toolbar-ruler.png`：A2 选中。
状态放 Pinia `stores/workbench.ts`：`tool: ToolId | null`、`view: 'skew'|'rect'`、`light: 1|2|3`、`channel: 'red'|'green'|'blue'|'yellow'`；点击 A 组按钮已选中则取消。

## 3. 左列 x 62..204（宽 143）

- **缩略图面板** y 163..442（280），底 `bg-muted`：缩略图图片 x 69..157、y 167..438（89×272），素材 `assets/mock/strip-thumbnail.png`（已含黄/蓝单元格高亮），`object-fill`。
- 缝 3px（y 443..445，`bg-card`）。
- **单元格面板** y 446..725（280），底 `bg-muted`：红色网格 SVG（`components/workbench/CellMap.vue`）x 77..154、y 454..718（宽 77 高 **264**，面板内 top 8）：6 列 28 行（竖线 7 条、横线 29 条，行距 9.43、列距 12.83），线色 `tool-red`，线宽 1，不透明度约 0.85；
  绿色视口框（3 列×3 行）x 102.7..141.2、y 520.3..548.6，描边 `tool-green` 1.5px，来自 `CellGrid.view`（column=2,row=7,columns=3,rows=3，坐标 = 列/行 × 单元尺寸；已按参考图校验）。
- 列与查看器之间有 3px 的 `bg-card` 竖缝（x 205..207）。

## 4. 查看器 `features/workbench/StripViewer.vue`（x 207..1266，y 163..725，`bg-muted`）

PCB 图像居中、自然尺寸 726×535，位置 x 373..1099、y 178..712，素材 `assets/mock/strip-image.png`（`image-rendering: auto`）。
插槽 `overlay`：叠在图像上的绝对定位层（页面/工具往里放 ROI、标尺）。指针移动时更新统计栏的 XY（鼠标位置按 `image.width/height` 与 `readout.wh` 缩放并加上 strip 偏移）；RGB 在图片加载后用 canvas 取样（浏览器里可用，测试里跳过）。

查看器内的 **工具面板** `ViewerTools.vue`（只在 TEACH 页显示，见 30-teach.md）。

## 5. 统计栏 `features/workbench/ReadoutBar.vue`（y 726..760，`bg-card`）

文字 10px（`text-3xs`），中心 y=748（设计）。标签粗体 `text-foreground`，值常规 `text-foreground/85`。按 x 起点排：
`CELL :` x=68，值 `18` x=112；`STRIP :` x=530，值 `29786,` `43278`（x=575, 614）；`WH :` x=679，值 `16384,` `12080`（x=710, 750）；`XY :` x=813，值 `15116,` `11957`；`RGB :` x=941，值 `31,` `31,` `31`；`Avg. GV :` x=1085，值 `0` x=1150；`Std. GV :` x=1190，值 `0.00` 右端到 1260。
数值用等宽数字（`tabular-nums`）。数据来自 `Readout`（STRIP/XY 随指针变化）。

## 6. 日志：同 00-frame.md。`LogConsole` 的 level 扩展为 `'info'|'notice'|'dim'|'select'`。

## 文件所有权（本步骤）

新建：`layouts/WorkbenchLayout.vue`，`features/workbench/{InfoBar,ToolButtons,StripViewer,ReadoutBar,ThumbnailPanel}.vue`，`components/workbench/{CellMap,ToolButton}.vue`，
`stores/workbench.ts`，`api/mock/workbench.ts`（`createWorkbenchSnapshot()`：header `TEST1020-00` / `TEST3` / `1`；image 726×535 = `import stripImage from '@/assets/mock/strip-image.png'`；thumbnail 89×272；cells 6×28、view {column:2,row:7,columns:3,rows:3}；readout cell 18、strip {29786,43278}、wh {16384,12080}、xy {15116,11957}、rgb [31,31,31]、avgGv 0、stdGv 0），以及对应的 `*.test.ts`。
修改：`api/client.ts`（加 `getWorkbench(): Promise<WorkbenchSnapshot>`）、`api/mock/index.ts`、`stores/machine.ts` 或新 store（加载 workbench 快照）、`pages/{Teach,Review,Calibrate,Settings}Page.vue`（改用 `WorkbenchLayout`，右侧栏先放原来的占位）。
素材的 `import` 走 Vite（`vite/client` 类型已有；vitest 下返回路径字符串）。
