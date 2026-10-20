# 40 REVIEW / CALIBRATE / SETTINGS 的右侧栏

左侧是工作台（20-workbench.md）。右侧栏 x 1271..1775（Ready 按钮下方），坐标为设计坐标：
review.png dy=8；calibrate.png dx=1 dy=3；settings.png dy=0。通用小部件：10px 文字，表格单元格间 1px 浅色分隔线，标题行前有 4×4 白色圆点 “● ”。

## REVIEW 右侧栏（review.png）

整块底 `bg-sheet-row`（#303030），x 1273..1775，y 118..925，无其他内容。
- 标题行 y 123..140（`bg-sheet-head`）：“● Inspection - Defect”（x=1281，10px，白）。
- 表头行 y 142..160（`bg-sheet-head`，10px，`text-sheet-muted`）：`Image` | `Merge ID` | `CH` | `Code` | `Size` | `Avr`，列边界 x 1275,1320,1376,1423,1628,1694,1748；表头单元格之间 1px 浅色分隔线。
- 表体空（`DefectRow[]` 为空数组，但组件要能渲染行：行高 16，`Size`/`Avr` 右对齐，`Code` 左对齐）。
文件：`features/review/{ReviewPanel,DefectTable}.vue`、`api/mock/review.ts`（`createDefects(): DefectRow[]` 返回 `[]`）、`stores/review.ts` 可选，`pages/ReviewPage.vue`，`api/client.ts` 加 `getDefects()`。

## CALIBRATE 右侧栏（calibrate.png）

x 1271..1775。自上而下：

1. **光源图区** y 118..393，底 `bg-muted`（#36353a）：光源图片 x 1284..1762、y 194..343（478×150，素材 `assets/mock/light-strip.png`），外加 1px 白边（`border border-white`）。
2. **控制行** y 393..425，底 `bg-card`：
   - 左：大开关，药丸 x 1276..1320、y 401..420（44×19）：`ON` 状态绿色（`bg-switch-on`，带轻微高光渐变，可用 `bg-gradient-to-b` + 令牌色叠白 `from-white/20`），左侧白色粗体 “ON” 11px，右侧灰色圆钮（r 8，`bg-slider-track`）；`OFF` 状态灰底、圆钮在左、文字 “OFF”。
   - 右：“Page Index :” 11px 右对齐于 x=1668，中心 y=408；下拉框 x 1727..1771，y 400..417（`bg-sheet-row`，1px `border-grid`），内容 “2”（x=1731）+ 右侧 ▾（x 1763）。
3. **表格区** y 430..925，底 `bg-card`：
   - 标题行 y 434..449：“● Calibration - Light”（x=1280，10px，白），底 `bg-sheet-head`，x 1275..1771。
   - 表头行 y 453..468（`bg-sheet-head`，10px，`text-sheet-muted`）：`Channel`（中心 x 1303）`Brigtness`（中心 x 1438；**原图拼写如此，保留**）`Value`（右对齐 x 1587）`Angle`（右对齐 x 1635）`Color`（右对齐 x 1681）`ON/OFF`（中心 x 1718）；列边界 x 1277,1329,1544,1592,1638,1695,1741。
   - 20 个数据行，行高 15.8，第 1 行中心 y=479，依次 +15.8（最后一行 779）；底 `bg-sheet-row`：
     - `Channel`：数字居中，10px。
     - `Brigtness`：滑块 x 1336..1540（204 宽，轨道高 3，`bg-slider-track`；已开启的行左侧填充 `bg-primary`，填充宽 = brightness/1000×204；关闭的行轨道和文字都变暗：轨道 `bg-foreground/35`，末端有 6×6 小方块 `bg-slider-track`）。
     - `Value`、`Angle`（如 `0°`）、`Color`（`White` `Blue` `Green` `Red`）：开启行文字 `text-foreground`，关闭行 `text-foreground/35`。
     - `ON/OFF`：开关药丸 28×11（x 1704..1732）：开启 `bg-primary`，白色圆钮在右（r 4）；关闭灰（`bg-slider-track/60`），深灰圆钮在左。
   - 数据（20 行，`CalibrationChannel`）：channel 1..20；angle：1–4 为 0°，5–12 为 30°，13–20 为 60°；color 循环 White, Blue, Green, Red（每 4 行一轮）；
     value：1000,165,250,90, 300,80,180,17, 300,80,180,15, 980,165,950,45, 980,165,950,45；
     on：仅第 2,3,4,14,16,18,20 行为 true；brightness 与 value 相同（滑块填充用 value/1000）。
   - 底部按钮行 y 902..920：`Auto`（x 1276..1368，文字暗，禁用）`Reload`（x 1478..1570）`Save`（x 1679..1771），底 `bg-sheet-row`，1px `border-grid`，10px。
文件：`features/calibrate/{CalibratePanel,LightImage,CalibrationTable,PowerSwitch}.vue`、`components/app/ToggleSwitch.vue`（也给设置页复用）、`api/mock/calibration.ts`、`stores/calibration.ts`、`pages/CalibratePage.vue`、`api/client.ts` 加 `getCalibration()`。

## SETTINGS 右侧栏（settings.png）

整块底 `bg-card`，x 1273..1775，y 118..925，内边距 左 7px。自上而下（中心 y）：

1. **“● Defect Mask Generation (Metal)”**：标题 x=1280，中心 y=146（10px，白）；开关（药丸 32×12，x 1473..1505，y 140..152）：关 = 浅灰轨（`bg-foreground/80`）+ 白色圆钮（r 6.5）在左；开 = `bg-primary` 轨 + 白色圆钮在右。参考图 Metal 关、SR 开。
   - 滑块行 **Morphic**：标签 x=1288（11px，`text-foreground`，中心 y=183）；轨道 x 1369..1749（380 宽，高 7，圆角 4），左半 `bg-mask-low`、右半 `bg-mask-high`，在值处分界；圆钮：金色（`bg-mask-thumb`）直径 12 带 2px 白环，位置 = 369 + value×380（0.50 → x=1558）；数值 “0.50” 在圆钮正上方（中心 y=167，10px，白）；两端刻度 “0.00”（左，x=1369，中心 y=198）和 “1.00”（右，右端到 1749），颜色 `text-mask-thumb`（金色）10px。
   - 滑块行 **Sensitivity**：同上，中心 y=239（数值 y=223，刻度 y=254）。
   - **Light / Channel** 下拉：标签 “Light” 右对齐于 x=1468（中心 y=296），下拉框 x 1479..1571，y 287..305（1px `border-grid`，`bg-sheet-row`，文字 10px，右侧 ▾）；“Channel” 标签右对齐 x=1647，下拉框 x 1659..1751；Metal 关闭时两个下拉为禁用（文字与边框暗，值 `1` / `Gray`）。
2. **“● Defect Mask Generation (SR)”**：同结构，标题中心 y=369；Morphic 中心 y=406（数值 390，刻度 421）；Sensitivity 中心 y=462（数值 446，刻度 477）；下拉中心 y=519（`Light` = `3`，`Channel` = `Red`，启用）。
3. **“● Inspcetion Light”**（**原图拼写如此，保留**）：标题中心 y=592；复选行中心 y=615：`Light1`（未选）框 x=1366、`Light2`（选中）x=1481、`Light3`（选中）x=1596、`Light4`（暗，禁用）x=1711；框 11×11，文字在框右 4px，11px。
4. **“● Global Align Light”**：标题中心 y=654；单选行中心 y=678：`Light1`（选中，点）x=1366、`Light2` x=1481、`Light3` x=1596、`Light4`（暗）x=1711；圆 11×11。
5. 分隔线 y≈735（x 1273..1775，1px `bg-background`）。
6. **“● Specification - Management”**：标题中心 y=764；按钮行 y 792..810（高 18）：`Update Default Insp Spec`（x 1286..1441）、`Update Default Light Spec`（x 1448..1604）（底 `bg-sheet-row`，1px `border-grid`）、`Revision`（x 1611..1763，`bg-secondary`），10px，文字居中。

数据：`SettingsSnapshot`（`api/types.ts`）：metal {enabled:false, morphic:0.5, sensitivity:0.5, light:'1', channel:'Gray'}；sr {enabled:true, 0.5, 0.5, light:'3', channel:'Red'}；
inspectionLights [{light:1,available:true,enabled:false},{2,true,true},{3,true,true},{4,false,false}]；globalAlignLight 1；globalAlignOptions [{1,true},{2,true},{3,true},{4,false}]。
交互：开关、滑块（拖动或键盘）、复选/单选、下拉都应真的可操作，状态放 `stores/settings.ts`；用 shadcn 的 `Switch`、`Checkbox`、`Select` 可以，但外观必须按上面尺寸/颜色覆盖（用 `cn` 合并类名）；滑块用自写 `components/app/MaskSlider.vue`（原生 pointer 事件，`role="slider"`，`aria-valuenow`，方向键调 0.01）。
文件：`features/settings/{SettingsPanel,MaskGeneration,LightChecks,SpecManagement}.vue`、`components/app/{MaskSlider,ToggleSwitch}.vue`（`ToggleSwitch` 与 CALIBRATE 共用，由先做的一步创建，后做的一步直接用）、`api/mock/settings.ts`、`stores/settings.ts`、`pages/SettingsPage.vue`、`api/client.ts` 加 `getSettings()`。
