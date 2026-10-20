# 10 HOME（参考图 design/reference/home.png，dx=0 dy=0）

HOME 已有首版实现（`pages/HomePage.vue`、`features/home/*`、`components/app/*`、`components/charts/*`），但它是按另一张更大的截图估的尺寸。
现在按 1778×929 基准**重新定尺寸**，结构不变，只改尺寸、间距、字号、颜色令牌。数据模型 `HomeSnapshot` 不变。

内容区 x 62..1266（宽 1205）；右侧栏 x 1273..1775（宽 503）。面板之间缝 5px（`gap-gap`）。所有面板底色 `bg-card`。

## 左侧内容（自上而下）

1. **ModelBar** y 118..150（高 33）：`MODEL :`（`text-label`）+ `TEST1020`（`text-value`）在 x=76，文字中心 y=134，17px；`LOT :` + `TEST3` 在 x=358；
   右侧 `DMG :`（粗体 11px 白）x=1061，灰色圆点 `Metal`（点中心 x=1125，r=6，文字灰 #999）、绿色圆点 `SR`（点中心 x=1203，文字绿 `text-positive/70`）。
2. **WorkStatus 面板** y 155..327（高 173）：标题 “WorkStatus” 粗体 13px（`text-sm font-bold`）x=76，中心 y=169；
   图例行中心 y=181：`None`（空心方块，x=973）`Work`（`bg-work-work` x=1043）`Error`（`bg-work-error` x=1113）`Complete`（`bg-work-complete` x=1183），10px（`text-3xs`），方块 10×10；
   表格 x 76..1253，y 196..313：表头行 196..216（高 20，`bg-grid-head`，粗体 11px，白），5 个数据行每行约 19px；格线 1px `border-grid`。
   列边界（x）：StripNo 76..140，Grab 141..215，GA 216..262，Align 263..337，Transfer 338..410，Prepare 411..475，Inspect 476..540，DMG 541..587，Defect 588..670，Defect Count 671..865，Total Count 866..953，Merge Count 954..1033，Final 1034..1253。
   第 1 行：`1` 黄色（`text-notice`）居中；各工位方块 12×10、间隔 5：Grab [work,work,complete]，GA [complete 宽 18]，Align [c,c,c]，Transfer [none,complete,complete]，Prepare [complete 宽 37]，Inspect/DMG/Defect 为暗的 none 方块。
3. **Inspection Area 面板** y 333..760（高 428）：标题 “Inspection Area” 粗体 13px x=76 中心 y=348；图例行中心 y=360：Bright、Dark、Chain、Skeleton、Barcode、SR Shift（方块 10×10 + 文字 10px，从 x=834 起，项间距约 52–70）；
   表格 x 76..1253：第一行（y 375..395）分组表头 `Light1 (DMG)`（绿）`Light2` `Light3`（粗体），分组宽 76..470、471..861、862..1253；
   第二行（y 397..418）每组 `Node`（白）`Red`（`text-light-red`）`Green`（`text-light-green`）`Blue`（`text-light-blue`），各组内列宽 Node 147，三个通道各约 80；
   数据行高约 15px，从 y=421 起，`OSP / L-Pad`（绿）、`NonMetal / Pattern1`、`NonMetal / Space1`；每个通道格里是 6 个 8×6 小方块（已用的用 `bg-kind-*` 实心，其余空心边框 `border-grid`）。
   下方分页条：`<<`  `1 / 1`  `>>`，居中，中心 y=741（按钮 28×22，`bg-card` 边框 `border-grid`）。
4. **日志** 见 00-frame.md（y 765..921）。

## 右侧栏（x 1273..1775）

整块自上而下，面板间缝 5px（上半的两个表之间 ~9px）：

1. **Inspection - Product**：标题行（y 123..140，`bg-sheet-head`）“● Inspection - Product” 10px，圆点后 4px，x=1281；
   表头行 y 142..160（`bg-sheet-head`，10px，`text-sheet-muted`）：Product | Camera | Resolution | Surface，列边界 x 1275,1396,1516,1637,1749；
   数据行 y 161..187（`bg-sheet-row`，10px）：STRIP | LineScan | 2.0 | TOP。
2. **Inspection - Component**：标题行 y 190..209，“● Inspection - Component”；表头 y 211..229：Component | Mode | IP Address | Port | Network，列边界 x 1275,1396,1490,1623,1690,1748；
   6 行，行高约 15.8（中心 y=238,254,270,286,302,317）：Inspector-1 MIU 192.168.200.10 2000 ▬(绿色小条 10×4)；Inspector-2..5 IPU .11 .12 .13 .14 2000；PxInference-1 DMG-MT 192.168.200.31 4000。文字 10px，Component 列 `text-sheet-muted`，其余偏白。
3. **CPU 瓦片** y 336..479（x 1275..1775，`bg-card`）：标题 “CPU” x=1290 中心 y=347（10px）；右侧 “[ System ]”（x 右对齐到 1760，10px 黄绿 #bcc87c，可用 `text-value/80`）；
   图：y 轴标签 `100 %` `75 %` `50 %` `25 %` `0 %` 中心 y=375,391,407,424,440（右对齐于 x≈1318，10px），绘图区 x 1327..1757，y 376..442，网格线 `stroke-chart-grid`（横线 5 条、竖线约每 14px 一条），折线 `chart-line`；底部 “Usage: 1.23%”（居中，中心 y=460，“Usage:” 灰白，数值 `text-value`）。
4. **Memory 瓦片** y 485..628：标题 “Memory” + “[ System ]”；y 轴 `640 GB` `480 GB` `320 GB` `160 GB` `0 GB` 中心 y=523,540,556,572,589；绘图区 x 1327..1757，y 520..595，面积填充 `bg-chart-area` 约占 0..160GB；底部 “Total: 639.41GB  Used: 207.93GB  Free: 431.49GB”（中心 y=608，数值用 `text-label`）。
5. **Network 瓦片**（两块）y 634..777：左 x 1275..1520，右 x 1525..1775：标题 “Network” x 左+15 中心 y=644；右上 IP（`text-label`，右对齐）`192.168.200.10` / `192.168.200.20`；
   y 标签 `69 Kb` / `86 Kb`（左上，中心 y=672）；绘图区宽约 180（x 1327..1507 / 1577..1757），y 676..741，折线黄色（`text-notice` 系）带尖峰；底部 “Send: 4.57 Kbps” / “Send: 0.00 bps”（中心 y=758）。
6. **Storage 瓦片** y 783..922（x 1275..1520）：标题 “Storage” 中心 y=793；环形仪表圆心 (1397,850)、外半径约 50、粗约 14，`gauge-used`（黄绿）+ `gauge-rest`（蓝）；仪表中央 “[D:]”（9px）；下方 “33.1%”（`text-label`，中心 y=883）；底部 “Total: 1.3 TB  Used: 451.0 GB  Free: 911.0 GB”（中心 y=902）。
7. **Data Manager 瓦片** y 783..922（x 1525..1775）：标题 “Data Manager” 中心 y=793；三个复选项（框 11×11 在 x=1546）`ResultData`、`MaskImage`、`OverlayImage` 中心 y=829,853,877，文字 11px；
   “Clear” 按钮 x 1529..1768，y 896..916，`bg-secondary`，文字 11px。

## 实现注意

- 保持 `features/home/*` 现有文件划分和 props；只改样式。`components/app/DataGrid.vue`、`StatusBlocks.vue`、`LegendList.vue`、`AppPanel.vue`、`PagerBar.vue`、`SegmentBar.vue`、`StatLine.vue`、`components/charts/*` 的尺寸参数可以改。
- 单元测试（`*.test.ts`）里如果有写死的尺寸，按新尺寸更新；不要删除测试。
- 模拟数据 `api/mock/data.ts`：数值按参考图（CPU Usage 1.23%，Memory Total 639.41GB / Used 207.93GB / Free 431.49GB，Network 69 Kb / 86 Kb，Send 4.57 Kbps / 0.00 bps，Storage 33.1% / Total 1.3 TB / Used 451.0 GB / Free 911.0 GB，Model `TEST1020`，Lot `TEST3`）。

## 右侧栏精确几何（逐像素测得；与上文冲突时以本节为准）

坐标是 home.png 的设计坐标（dx=dy=0）。右侧栏 = `w-aside`(503) 的 `bg-card` 面板 x 1272..1774，`px-[3px]`，瓦片 x 1275..1771（宽 497），
`pt-[3px]`（瓦片从 y=121 起），瓦片之间缝 3px（缝是 card 色，不是 background 色），底部 `pb-[3px]`。

| 瓦片 | y（外框） | 高 | 底色 |
| --- | --- | --- | --- |
| Product | 121..186 | 66 | 标题+表头条 `bg-sheet-head`（local y 1..39），数据区 `bg-sheet-row` |
| Component | 190..331 | 142 | 标题+表头条 `bg-sheet-head`（local y 2..39），其余 `bg-sheet-row` |
| CPU | 335..480 | 146 | `bg-card` |
| Memory | 484..629 | 146 | `bg-card` |
| Network ×2 | 633..778 | 146 | `bg-card`；左 x 1275..1521，右 x 1525..1771（各宽 247，缝 3） |
| Storage / Data Manager | 782..922 | 141（余下高度） | `bg-card`；左 1275..1521，右 1525..1771 |

监测瓦片（CPU/Memory/Network/Storage/Data Manager）带 1px 边框，色约 `white/7`（#3a3a3c 叠在 #2d2d2f 上），Product/Component 同。
下面“local”坐标 = 相对瓦片外框左上角（`MonitorTile` 用 `after:` 伪元素画边框，所以子元素的绝对定位原点就是外框左上角）。

### Product（origin 1275,121）
- 标题 “● Inspection - Product”：local left 6，文字中心 y 11（10px `text-3xs`，`text-foreground`）。
- 标题与表头之间的分隔线：local y 20，高 1px，x 0..474，`bg-white/10`。
- 表头行 local y 21..39（19px），数据行 local y 40..56（17px，文字中心 y 48）；表宽 474（local x 0..474，右侧 23px 空）；
  4 列宽 120/121/121/112；表头单元格左边框 `border-l border-white/10`（首列无），整行右边框同；
  表头文字 `text-foreground/85`，数据行 `text-foreground`；10px 居中。数据：STRIP / LineScan / 2.0 / TOP。

### Component（origin 1275,190）
- 标题 “● Inspection - Component”：local left 6，文字中心 y 11。分隔线 local y 20，x 0..497。
- 表头行 local y 21..39（19px，文字中心 y 30）；6 个数据行从 local y 40 起，行高 16（第一行中心 y 48）。
- 列宽 120/94/134/66/83（共 497）；表头单元格间 `border-l border-white/10`。
- 单元格文字（10px 居中）：Component 列 `text-sheet-muted`，Mode 列 `text-foreground/90`，IP 列 `text-sheet-muted`，Port 列 `text-sheet-muted`，Network 列是 10×4 的 `bg-positive` 小条。

### 图表瓦片（local 坐标）
- 标题：left 14，文字中心 y 11（`top-[6px]`，10px，`text-foreground`，`leading-none`）。
- 绘图区统一：top 42，高 65；CPU / Memory：left 51、宽 431（x 1326..1757）；Network：left 51、宽 179（x 1326..1505）。
  网格：5 条水平线（i*(65-1)/4 取整 +0.5，即 0.5, 16.5, 32.5, 48.5, 64.5），竖线：CPU/Memory 每 21.5px、Network 每 9px，从 x=0.5 起；
  线色 `stroke-chart-grid`，1px，`crispEdges`，**网格画在折线下面**。折线+面积同一填充 `fill-chart-line`（#e4fd42），Memory 的面积用 `fill-chart-area`。
- y 轴标签（CPU `100 %`…`0 %`；Memory `640 GB`…`0 GB`）：右缘 local x 43（绘图区左 8px），垂直居中于各水平线；10px，`text-foreground/85`。Network 没有 y 轴标签，只有绘图区上方一个值标签（`69 Kb` / `86 Kb`：left 14，中心 y 39，`text-foreground/85`）。
- 右上角：CPU “[ System ]” `text-chart-line/65`，Memory “[ System ]” `text-sheet-muted`，右缘 local x 484（`right-[13px]`），中心 y 11；Network 的 IP（`192.168.200.10` / `.20`）`text-chart-line/85`，右缘 local x 232，中心 y 11。
- 读数行：中心 y CPU 125 / Memory 124 / Network 125；CPU、Memory 居中于绘图区（x 中心 266），Network 居中于瓦片；
  标签（`Usage:` `Total:` `Used:` `Free:` `Send:`）`text-foreground/85`，数值 CPU/Network/Storage `text-chart-line/80`，Memory `text-sheet-muted`；项间距 12px。
- 数值：CPU `Usage: 1.23%`；Memory `Total: 639.41GB  Used: 207.93GB  Free: 431.49GB`；Network `Send: 4.57 Kbps` / `Send: 0.00 bps`。

### Storage（origin 1275,782）
- 标题 “Storage” 同上（中心 y 11）。半环：圆心 local (122.5, 93.5)，外半径 50，内半径 29，从左端 180° 起 33.1% 为 `fill-gauge-used`（黄绿），其余 `fill-gauge-rest`（蓝），环底边在 y 93.5。
  “[D:]” 10px 居中于 (123, 63.5)；“33.1%” 居中于 (123.5, 101)，`text-chart-line/70`；读数行 `Total: 1.3 TB  Used: 451.0 GB  Free: 911.0 GB` 中心 y 118.5，居中于瓦片。

### Data Manager（origin 1525,782）
- 标题 “Data Manager”：left 15，中心 y 11。
- 三个复选行：框 11×11 left 15，文字 left 29（11px `text-foreground`），行中心 y 46.5 / 71 / 95。
- Clear 按钮：left 4、top 113、宽 239、高 22；`bg-sheet-row` + 1px `border-sheet-head`，文字 “Clear” 11px `text-foreground/85` 居中。

### 数据
Network 字段已改名 `maxKb` / `sendKbps`（Kb、Kbps），0 显示 `0.00 bps`。CPU 折线：基线约 1%，idx 47 和 55 处有两个约 11% 的小尖峰；
Network 折线：基线 1–3%，idx 47 处约 67% 的尖峰（前后各 1–2 个点的斜坡），随后几个 10–15% 的小凸起。历史点数 60。
