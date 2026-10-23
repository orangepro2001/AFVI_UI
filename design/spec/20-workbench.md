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

PCB 图像居中、自然尺寸 726×535，位置 x 373..1099、y 178..712，素材 `assets/mock/strip-image.png`（`image-rendering: auto`）。**这是浏览器里（模拟后端）的图；Wails 窗口里中间的图是仓库里当前模型、当前灯的 Median 图**（见本文件第 7 节），位置同样 `top 15`、水平居中，显示尺寸 781×536（与 Align 的合成图同宽）。
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

## 7. 中间的图（Median 图）与量尺 / GV 工具

### 图

`stores/workbench.ts` 的 `frame` 是查看器当前显示的图和它代表的像素尺寸：

- 后端有当前模型、当前灯的 Median 图（`PxRepository/<模型>/…/MEDIAN/Median_<a>_<b>_<c>.tif`，`c` = 灯号 − 1，即工具栏三个灯泡：`c=0` Light-1 …）时，`frame` 是它的预览（Go 把 TIFF 缩到 1/4 再放成 781 宽；TIFF 本身 5860×4020、8 位灰度）。`size` = TIFF 的像素尺寸，读数栏的 **WH** 就是它，**XY** 是指针在 TIFF 里的像素，**RGB** 是指针下预览像素的灰度（三个分量相同），STRIP 仍是 XY 加上快照的偏移。
- 没有（`state` 为 `missing` / `unreadable`，或调用失败）时退回设计图里的条带图（`size` 16384×12080），GV 不能量（图上写 “No Median picture of Light-n”），量尺照常可用。
- 换灯泡 → 重新取那个灯的图（旧的答案晚到会被丢掉）；换模型 / 换主机 → 重新取，并清掉量尺和 GV 框。
- 仓库只读：Go 从不写 `PxRepository`。仓库通常在网络共享上，所以**每张图一个会话里只读一次**：Go 整个文件一次顺序读入、解码后留在内存里（总量不超过 256 MB，超了丢最久没用的），之后的 `GetMedianView`、每一次 `MeasureGv`（拖框时每秒几十次）都不再碰共享——不查目录、不查文件日期、不读 XML。前端同样按灯留住 `MedianView`（预览 data URL），来回切灯泡不再向后端要。要重新读：在 Connector 对话框里再点一次 Apply（`ReloadPictures` + `inventoryEpoch`），或重启应用。

### GV 工具（工具栏 A3）

`stores/measure.ts`；叠加层 `features/workbench/GvLayer.vue`，右侧工具列是 `ViewerTools`（`draw` 变体，`live`）。框的坐标是 **TIFF 像素**，显示时乘 781 / 5860。

- 工具列：`select`（移动框）与 `rect`（画框）二选一，默认 `rect`（参考图里高亮的就是它）；`trash` 在有框时可用；其余按钮只是画出来。
- `rect`：在图上按下拖动画一个框（替换旧框，**小于 3 个屏幕像素的拖动当作点击，旧框保留**）；松开后工具仍是 `rect`。`select`：拖框身体移动，背景上什么也不做。8 个抓手（r=4，命中区 r=9）在两种工具下都能缩放，框最小 1 个 TIFF 像素，且不会翻转。
- 框内正中是 `GV : <均值取整>`（黑底 60%，参考图 38×14），读数栏的 **Avg. GV** 是同一个整数，**Std. GV** 保留两位。没有框或没量到时是 `0` / `0.00`，标签是 `GV : -`。鼠标悬停在框上有一条 tooltip：Avg / Std / Min / Max / 像素数 / 实际测量的框。
- 数值由 Go 在**完整 TIFF** 上量（`MeasureGv`，移植自 AFVI_TEACH 的 `core.MeasureGv`）：框向外取整并夹进图里，至少一个像素，总体标准差。拖动中实时重量，同一时刻只有一个请求在途、只问最新的框；错误显示在图底部。
- 键盘：`Delete` / `Backspace` 删框；方向键移动 1 像素，Shift 10 像素；`Esc` 取消正在进行的拖动（框回到拖动前）。输入框里不响应。
- 换灯泡 → 同一个框在新灯的 Median 图上重量。

### 量尺工具（工具栏 A2）

叠加层 `features/workbench/RulerLayer.vue`，没有右侧工具列（参考图里没有）。端点是 **TIFF 像素的整数**。

- 在图上按下拖动画线（替换旧线）；线最短 3 个屏幕像素，**更短的当作点击，并清掉量尺**。端点停在图的边缘。
- 画出：红线 2px、两端圆点（`overlay-handle`，r=4）、端点坐标 `(x, y)`（`overlay-text`，绿）、中点旁的距离 `3941.12px`（`overlay-measure`，青，两位小数，单位是 TIFF 像素）。参考图的数据 (5086, 2032) → (8590, 3836) 正好是 3941.12px。
- 端点文字写在**背离另一端**的一侧：上左端写在左上、下右端写在右下（与参考图一致），反方向画时跟着换边（`endLabel`）。
- 拖端点只动那一端；拖线身整体平移（保持形状，停在图边）。最后画出或抓住的端点是方向键移动的端点（1 像素，Shift 10）。`Delete` / `Backspace` 清线，`Esc` 取消拖动。
- 量尺不依赖 Median 图：退回设计图条带时用 16384×12080 的像素。

两个工具的内容在切换工具后保留（只显示当前工具的），换模型 / 主机清掉。开发预设 `?tool=gv` / `?tool=ruler` 会放上参考图里的框（x 220.3、y 113、152.4×98.5）和线。

涉及的文件：`stores/measure.ts`、`features/workbench/{GvLayer,RulerLayer,measure-geometry}`、`layouts/WorkbenchLayout.vue`（四个工作台页共用，所以 REVIEW / CALIBRATE / SETTINGS 的工具栏也能用）、`api/mock/measure.ts`；Go：`internal/inventory/median.go`。

