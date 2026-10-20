# 设计图 1:1 还原流程

这个项目的主要工作是把设计图还原成界面。流程围绕三件事：**固定基准尺寸、让差异可见、让数值有出处**。

## 基准

- 设计图是 **约 1778×929 的窗口截图**，所以设计基准视口是 **1778×929**（`scripts/snap.sh --size 1778x929`）。Wails 窗口以 `Maximised` 启动，1920×1080 下视口更大，多出的空间由主区域伸缩吸收；外壳尺寸与字号不变。
- 布局按像素写：页头 58px、页签行 56px、左侧图标栏 57px、右侧栏 503px、面板之间 5px 缝（`theme.css` 里的 `--spacing-*`）。窗口最小 1280×720。
- 每一页的尺寸、坐标、数据都写在 `design/spec/`（`00-frame.md` 外壳与日志、`10-home.md`、`20-workbench.md` 工作台公共部分、`30-teach.md`、`40-panels.md` REVIEW/CALIBRATE/SETTINGS、`50-teach-nodes.md` 选中节点后的 TEACH、`60-login.md` 登录对话框、`70-global-dialogs.md` rail 触发的全局对话框与加载遮罩）。**改界面先读对应的 spec，量出新数值后同步改 spec。**

## 1. 设计图与截图偏移

设计图在 `design/reference/`，入库：`home.png`、`teach.png`、`review.png`、`calibrate.png`、`settings.png`，加两张工具栏局部图 `top-toolbar-gv.png`、`top-toolbar-ruler.png`，以及 TEACH 右栏的两张局部图 `right-block-1.png`（Unit）、`right-block-2.png`（Dummy），选中节点的几组图（`right-block-AlignROI-*`、`right-block-NonMetal*`）和登录对话框（`left-block-menu-login*`）。

这些图是人手截的，顶部多裁了几个像素，所以每张图要平移才与基准重合。下表是“图中坐标 − 设计坐标”：

| 参考图 | dx | dy |
| --- | --- | --- |
| home.png、settings.png | 0 | 0 |
| teach.png | 0 | 3 |
| calibrate.png | 1 | 3 |
| top-toolbar-ruler.png | 0 | 1 |
| top-toolbar-gv.png | 2 | 6 |
| review.png（底部带 Windows 任务栏，忽略） | 0 | 8 |
| right-block-AlignROI-Metal.png | 5 | 6 |
| right-block-AlignROI-SR.png | 3 | 4 |
| right-block-AlignROI-DMG.png | 2 | 7 |
| left-block-menu-login[no.2 icon].png | 3 | 2 |
| left-block-model-select[no.4 icon].png | 2 | 2 |
| left-block-menu-image[no.5 icon].png（顶部带 20px Windows 标题栏） | 2 | 22 |
| left-block-menu-Cam-Generate[no.6 icon].png | 1 | 3 |
| left-block-menu-Align[no.7 icon]…png | 5 | 3 |

后四张整窗图的客户区约 1778×925，所以截图要写 `scripts/snap.sh --route /teach --size 1778x925`；右栏局部图（AU~OSP、NonMetal、User Mask）是裁剪图，偏移含义见 `design/spec/50-teach-nodes.md`。

页面里要进入某个参考状态（选中节点、对话框打开、指针在图上…）用开发预设，不用点：`?node=metal|sr|dmg|pad|nonmetal|user-mask|<id>`、`?pointer=x,y`、`?dialog=login|model|grab|generate`、`?busy=1`（对话框和遮罩是窗口级的，在任何 `--route` 上都有效）、`?scroll=bottom|<px>`（参考图的树滚动了 108px）、`?tool=gv|ruler`、`?spec=dummy`，定义在 `frontend/src/dev/preset.ts`，只在 `import.meta.env.DEV` 下生效。
spec 里的坐标已经是设计坐标（`y_设计 = y_图 − dy`）。量颜色和尺寸时用图中坐标，再换算。

## 2. 起开发服务器并截图

```bash
cd frontend && pnpm dev            # 另开一个终端
scripts/snap.sh                    # 首页 → design/snap/home.png
scripts/snap.sh --route /teach     # 其他页面 → design/snap/teach.png
```

`snap.sh` 用无头 Chrome（找不到 Linux 版时会用 WSL2 里 Windows 的 Chrome/Edge）按给定尺寸、设备像素比 1 截图（`--size` 默认就是 1778×929）。可用环境变量 `CHROME` 指定浏览器，`--out` 改输出，`--url` 改服务器地址，`--query` 追加 URL 参数。无头 Chrome 不画原生滚动条，所以界面里的滚动条都是自绘的（`components/app/ScrollBar.vue`）。

URL 参数（开发模式，生产包里没有）：

| 参数 | 含义 |
| --- | --- |
| `freeze` | 模拟后端停止产生数据（图表、时钟、日志不再变），截图可重复；比对时必加 |
| `tool=gv` / `tool=ruler` | 选中工具栏上的这个工具，显示对应的 ROI / 标尺叠加物（`src/dev/preset.ts`） |
| `spec=dummy` | TEACH 页切到 Dummy 规格树 |

## 3. 叠加比对

URL 带 `design` 参数就会把设计图 1:1 盖在界面上：

```
http://localhost:5173/?freeze&design=reference/teach.png&dx=0&dy=3&blend=difference&opacity=1#/teach
```

| 参数 | 含义 |
| --- | --- |
| `design` | `design/` 下的图片路径（由开发服务器在 `/__design/` 提供，只读、只允许图片、禁止越界） |
| `blend` | `normal`（半透明叠加）或 `difference`（差值：完全一致的地方是黑色，不一致的地方亮起来） |
| `opacity` | 0–1，初始不透明度 |
| `dx`、`dy` | 图要向左上平移多少像素，填第 1 节表里的值 |
| `controls=0` | 隐藏右下角控制面板（截图时用） |

右下角面板可以调不透明度、混合模式、`dx`/`dy`、显示/隐藏。叠加图层不接收鼠标，页面仍可操作。

自动出差异图：

```bash
scripts/snap.sh --size 1778x929 --route /teach \
  --query 'freeze&design=reference/teach.png&dx=0&dy=3&blend=difference&opacity=1&controls=0' \
  --out design/snap/teach-diff.png
```

叠加代码只在 `import.meta.env.DEV` 下动态加载，`pnpm build` 的产物里没有它。

### 把差异量化：`scripts/diffgrid.go`

肉眼看差异图容易漏。先截一张不带叠加的图，再用 `diffgrid` 按格子算平均绝对差：

```bash
scripts/snap.sh --size 1778x929 --route /teach --query 'freeze' --out design/snap/teach.png
go run scripts/diffgrid.go design/snap/teach.png design/reference/teach.png 0 3 40 1271 118 507 807
#                          我们的图                参考图                    dx dy 格 x    y   w   h
```

输出一张热力图（`.` 表示格内平均差小于 10，否则是十位数字）、整个区域的平均差和最差的 12 个格子。判读：

- **文字必然有差**：Linux 上回退到别的字体，字形和宽度都不同，文字密集的格子（日志、表头）总是最亮。看线条、方框、填充色的几何：线位置偏 1px 会在整条线上亮起来。
- 平均差 3–6 是“几何一致、只有字形不同”的水平；明显更高的格子再用 `runs.go`、`crop.go` 看。
- 区域超出参考图的像素不计入。

本项目当前各页整帧平均差：home 5.96、teach 4.48、review 2.93、calibrate 4.83、settings 3.72（顶部栏里的时钟、工具图标和左侧图标栏的字形差异占了大头）。

## 4. 取色与量尺寸

不要凭感觉写颜色。用 `scripts/pixel.go`（只用 Go 标准库，不需要装任何东西）从设计图里读：

```bash
go run scripts/pixel.go design/reference/home.png 120,35            # 单个像素
go run scripts/pixel.go design/reference/home.png 0,0,1778,58       # 区域：占比最大的颜色，就是填充色
go run scripts/pixel.go design/reference/home.png 20,300,40,40 900,500,200,100
go run scripts/textcolor.go design/reference/home.png 68,797,100,12 # 文字区域的前景色（离底色最远的 4% 像素的平均）
go run scripts/runs.go design/reference/home.png h 400 0 1778 6 3   # 沿一条线列出颜色近似的连续段：量线、方框、边的位置
go run scripts/crop.go design/reference/home.png /tmp/x.png 1271 118 507 807 2   # 裁切并放大，用来看细节
```

区域模式会列出占比最高的三种颜色，面板底色是占比最高的那个，抗锯齿边缘不会干扰。文字颜色用 `textcolor.go`；用 `runs.go` 量边：一条水平线上从 #36353a 变成 #ffc910 的那个像素就是芯片的左边缘。把得到的十六进制值填进 `frontend/src/styles/themes/afvi-dark.css` 对应令牌（令牌名按用途命名，不按颜色命名），注释里写上取样位置。

图标不是 lucide 能近似的时候（查看器工具列的 20 个字形），用 `scripts/icontrace.go` 从设计图里描出轮廓，生成 `frontend/src/features/workbench/tool-glyphs.ts`，不要手改生成物。

没有 Go 也可以：在浏览器里打开 `http://localhost:5173/__design/reference/home.png`，用 DevTools 的取色器点像素，或者用 Windows PowerToys 的 Color Picker。

量尺寸同理：在叠加的 `normal` 模式下看边缘对不对齐；整数像素的尺寸写成 Tailwind 任意值（`h-[34px]`），重复出现三次以上的数值提成 `theme.css` 里的设计常量。

## 5. 一个页面的完成标准

1. 路由、页签、占位已经在（`routes.ts`）。
2. 面板用 `features/<页面>/` 拼装，用到的数据都经过 `ApiClient`，模拟后端能回答。
3. 差异图除了文字字形外几何一致（`diffgrid` 的热力图里没有成片的亮格子；每一处差异都能解释）。
4. 没有裸颜色、没有调色板类名：`pnpm check` 通过（主题契约测试会检查）。
5. 在 Windows 上运行 `AFVI-UI-*.exe`，最大化后与设计图对一眼：字体渲染、DPI 缩放、WebView2 与 Chrome 的细微差异只能在真窗口里看到。
6. 新增的纯逻辑有单元测试。
7. 1914×1010 之类更大的窗口里，贴边元素仍贴着设计里的那条边（见 `design/spec/00-frame.md`）。

## 6. 窗口比设计基准大时

设计尺寸是 1778×929，但用户的窗口更大（例如 1914×1010 的客户区），多出的空间由主区域伸缩吸收，外壳尺寸与字号不变。每个元素保持它在设计图里贴着的那条边，规则和逐元素的贴边清单见 `design/spec/00-frame.md` 的“窗口比设计基准大时（锚定规则）”一节。

### 验收

**设计尺寸下必须逐像素不变。**

```bash
# 改前先存一份
scripts/snap.sh --size 1778x929 --query freeze --out design/snap/before.png
# 改后再截一张
scripts/snap.sh --size 1778x929 --query freeze --out design/snap/after.png
# 量化：mean abs diff 应约 0.01（只有顶栏实时时钟会变）
go run scripts/diffgrid.go design/snap/after.png design/snap/before.png 0 0 100
```

再用大窗口看一眼贴边效果：

```bash
scripts/snap.sh --route /teach --size 1914x1010 --query freeze
```

## 字体与 DPI

- 字体栈：`Segoe UI`、`Malgun Gothic`（韩文）、`Microsoft YaHei UI`、系统无衬线。设计机上这些字体都在；在 Linux 上截图时字体会回退，**字形和宽度会有差别**，判断文字对齐时以 Windows 窗口里的效果为准。
- 如果设计图是在 125%/150% 缩放下截的，先按 100% 重新截，或者按比例换算再填尺寸。
- 浏览器截图用 `--force-device-scale-factor=1`，保证 1 CSS 像素 = 1 图像像素。
