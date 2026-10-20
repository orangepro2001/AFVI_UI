# 50 TEACH 的节点状态（Align / ROI、NonMetal、User Mask）

来源：`design/reference/right-block-AlignROI-{Metal,SR,DMG}.png`、`right-block-AlignROI-[AU~OSP][total 6 item].png`、`right-block-NonMetal[total 9 item].png`、`right-block-AlignROI-etc-UserMask.png`。这批图的客户区约 1778×925（比 1778×929 少 4px），截图要用 `scripts/snap.sh --route /teach --size 1778x925`。

选中规格树里的节点（`stores/teach.ts` 的 `select(id)`）会同时改变三处：查看器、右栏分析表、规格芯片的选中色。再点一次同一节点保持选中，`select(null)` 清除；切 Unit / Dummy 页签会清除选中。

## 截图偏移（图 − 设计）

| 参考图 | dx | dy | 说明 |
| --- | --- | --- | --- |
| right-block-AlignROI-Metal.png | 5 | 6 | 整窗 |
| right-block-AlignROI-SR.png | 3 | 4 | 整窗 |
| right-block-AlignROI-DMG.png | 2 | 7 | 整窗 |
| left-block-menu-login[no.2 icon].png | 3 | 2 | 整窗，见 60-login.md |
| right-block-AlignROI-[AU~OSP]…png | −1270 | −59 | 右栏裁剪：参考坐标 = 我们的坐标 + (−1270, −59) |
| right-block-NonMetal…png | −1271 | −63 | 右栏裁剪，树滚动 `scroll=108` |
| right-block-AlignROI-etc-UserMask.png | −1270 | −57 | 右栏裁剪（分析区） |

裁剪图量差异用 `go run scripts/diffgrid.go ours.png ref.png dx dy 40 [x y w h]`，坐标是裁剪图坐标；±1px 的偏移误差存在。

## 查看器模式（`teach.viewerMode`）

| 选中 | 模式 | 查看器内容 | 读数栏 | 工具列 |
| --- | --- | --- | --- | --- |
| 无 | `strip` | 整条 Strip 图 | `full`（CELL / STRIP / WH / XY / RGB / Avg. GV / Std. GV） | 仅 GV 工具选中时，`draw` 变体 |
| Metal / SR / DMG | `align` | 对齐图 781×536，左上角 `calc(50% − (宽/2 + 2)px)`、顶 13px | 指针移到图上之前空白，之后 `xy`（XY + RGB） | `roi` 变体，总是显示 |
| 其他节点（AU、OSP、NonMetal 项、User Mask…） | `blank` | 空查看器（`bg-muted`） | 空白 35px 条 | 无 |

- 叠加物 `MK / A_C / I_C / SK`：没选中或选中 Align 节点时变暗，选中其他节点时（`blank`）变亮（`overlayEnabled`）。
- 进入 `align` / `blank` 时工具栏（`ToolButtons`）整排禁用（`workbench.toolsLocked`），回到 `strip` 恢复。
- 对齐图 `alignImages` 在模拟数据里是 `src/assets/mock/align-{metal,sr,dmg}.png`（781×536，从参考图裁出，Metal / DMG 的图里烤进了 ROI 标记）。
- 开发预设：`?node=metal|sr|dmg`、`?pointer=2734,2484`（Metal）、`?pointer=5806,3881`（DMG）；SR 的参考图里指针尚未移到图上，读数栏空白（`pointerSeen=false`）。

## 查看器工具列（`ViewerTools.vue`）

取代 30-teach.md 里“工具面板”一节（旧数值是在窄窗口下量的，不准）。

- 列本体：查看器右缘的 78px 宽条，`bg-card`，通高；按钮 30×30、圆角 8px、2px 边框。
- 左列按钮 x=6，右列 x=43；各行 top（相对查看器顶）：5（单个）、68、105、142、206、243、280、343、406、470（单个）、527，共 20 个按钮。
- 图标是从参考图描出来的字形，在 `features/workbench/tool-glyphs.ts`（由 `scripts/icontrace.go` 生成，**不要手改**；`GLYPH_VIEW_BOX = '0.7 0 30 30'`）。
- 可用的：`select`、`rect`、`trash`（`roi` 变体另有 `save`）；`trash`、`save` 是动作，不保持选中。`draw` 变体里选中的矩形用 `border-tool-active`，`roi` 变体里选中的矩形没有特别的颜色，与普通可用按钮相同。
- 按钮名称是占位，设计图没有给。

## 右栏

### 规格芯片与树

- 选中的芯片：`bg-spec-selected`（`#ff4400`）+ `text-tab-foreground`。
- Unit 树：`Align / ROI [Metal, SR, DMG]`，`AU`、`OSP`（各 C-Pad、B-Pad、L-Pad）、`Drill [Hole, Vent]`、`NonMetal`（9 项：SR All、Pattern1、PatternThick、Space1、SpaceThick、Open1、EtchBack、Open2、VIA/Laser Marking）、`ETC`（只有 User Mask）。窗口放不下，树可滚动，`data-spec-scroller` 标记滚动容器。
- 树里的 `Metal` / `SR` / `DMG` 带 `align` 字段（`'metal' | 'sr' | 'dmg'`），决定查看器显示哪张对齐图。

### 分析区（`AnalysisPanel.vue`）

面板宽 279px，三张表共用 `No. 38 / Name 148 / Value 74 / Min 19`（第四列 Min 仅通道表，被裁掉一半）。

- 表头：17px `bg-sheet-head` + 2px `border-white/5` 分隔线，共 19px；表头 top（面板内）：上表 0、下表 171、通道表 369（设计 y 197 / 368 / 566）。
- 行高 15.82px（Qt 的缩放值），行 pitch 15.82；表体 top = 表头 top + 19。
- 通道页签 24px 高 + 2px 红色细条 + 1px `bg-grid` 发丝线；颜色目前总是红。
- 行：`No.` 灰蓝 `text-analysis-no`；名称按 tone：`green` / `yellow` / `plain` 对应 `text-analysis-{green,yellow,plain}`；值 `text-analysis-value`，上表居中、下表右对齐（右内缩 3px）、通道表左对齐（左内缩 4px）；布尔值显示 `ToggleSwitch` 的 `table` 变体（31×14，关态 `--switch-off` / `--switch-off-knob`）。
- 名称超宽用 `truncate`；字体宽度与参考图不同，所以省略号出现位置略不一样。
- 只有 Light 2 有数据（Light 1、3 的表为空）；绿 / 蓝通道复制红通道的行。

| 节点 | 上表 | 下表 | 通道表（红） |
| --- | --- | --- | --- |
| C-Pad / B-Pad / L-Pad（AU、OSP） | 9 行 | 9 行 | 18 行（Bright / Dark 各 9） |
| NonMetal 各项 | 4 行 | 空 | 6 行 |
| User Mask | 空 | 空 | 5 行，名称 `plain` |
| DMG | 空 | 空 | 1 行 |
| 其他（组、Drill、Metal、SR…） | 空 | 空 | 空 |

## 已知不确定项

1. “非 Align 节点显示空查看器”只在 User Mask 的参考图里见过，其他节点按此推断；
2. Drill 与分组节点没有参考图，分析表为空；
3. 模拟的 `pointAt` 对 Align 图也用整条 Strip 的比例换算 XY，设计里 Align 图的 XY 含义没有给出；RGB 暂显示 0,0,0（没有采样）；
4. 通道页签的色条始终是红色，没有看到绿 / 蓝选中时的参考图；
5. 左侧 rail、顶栏、工具栏的图标仍是 lucide 近似。
