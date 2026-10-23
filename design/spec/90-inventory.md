# 90 · PxInventory：从 XML 到界面（Go 后端解析）

TEACH 右半部分（Specification 树、Align 行、Image Analysis 三张表）与左上角 MODEL 名，不再是模拟数据，而是 Go 后端读 `PxInventory` 下的 XML 得到的。浏览器里（`pnpm dev`）仍由 `api/mock` 回答，保持设计图 1:1；Wails 窗口里由 Go 回答（`api/wails.ts`），开发时也可以通过 `scripts/devapi.go` 让浏览器连上 Go（见 `docs/FRONTEND.md`）。

实现：`internal/inventory`（解析与服务，纯 Go，有测试）→ `app.go`（导出给 Wails）→ `api/wails.ts`（适配）。JSON 契约在 `internal/inventory/types.go` 与 `frontend/src/api/types.ts`，两边逐字段对应。

## 数据来源

`design/repo/` 是三台机器的 `PxInventory` 快照：`FM1`、`FM2`（Surface 0，Top）与 `BM`（Surface 1，Bottom）。默认用 `FM1`。

```
<机器>/PxInventory/
  Application.xml              <system Model="6ST2001Q01" Resolution="2.0">   当前模型的基名与分辨率
  SystemList.xml               <subsystem Surface="0|1">                      0 = TOP，1 = BOTTOM
  SpecTreeNode.xml             节点名字与颜色（gpnode / pnode / cnode）
  SpecTreeNodeList.xml         每个 gpnode（1 Unit，2 Dummy）下有哪些 pnode、cnode，顺序即树的顺序
  SpecParameter.xml            ParamKey → 文字（LangCode 0 = English，1 = Korea；界面用 English）
  INSPECT_SPEC/<模型>/<TOP|BOTTOM>/
    AlignSpec.xml              <GlobalAlign L1Channel L2Channel L3Channel>、<SRAlign Light Channel>
    LIGHT0|LIGHT1|LIGHT2/InspectionSpec.xml     Light-1 / Light-2 / Light-3 的参数
```

只认上面这些确切的路径与文件名。`* - 복사본`、`*.bak`、`*_bk`、`*_BackUp`、`*:Zone.Identifier`、`Thumbs.db`、`LIGHT2_bk` 都是备份或杂物，一律忽略。XML 带 CRLF 与 UTF-8；用 `encoding/xml` 解析，不要用正则。

## 模型

- 列表：`INSPECT_SPEC` 下的每个子目录就是一个模型，名字就是目录名（`6ST2001Q01-00`），按名字不区分大小写升序，`index` 从 `01` 起。`created` = 目录修改时间（本地时间 `2006-01-02 15:04:05`）。`resolution`：优先 `PxRepository/<基名小写>/` 下形如 `2.0` 的子目录名，没有就用 `Application.xml` 的 `Resolution`。基名 = 去掉末尾 `-NN`（两位数字的修订号）。
- 当前模型：目录名以 `Application.xml` 的 `Model` + `-` 开头的那个（多个取名字最大的）；没有匹配就取列表第一个。`state` 列：当前模型写 `Load`，其余空。
- `SelectModel(name)` 只改后端内存里的当前模型，不写任何 XML。名字不在列表里返回错误。
- 前端：`stores/app.ts` 的 `model`（`ActiveModel`）。工作台页左上角 MODEL 显示 `model.name`；HOME 的 ModelBar 显示 `model.base`。模型对话框 Apply → `app.selectModel(name)` → TEACH 重新载入规格树并清空选中。

## Specification 面板

- 侧：`SystemList.xml` 第一个 `subsystem` 的 `Surface`：0 → `TOP`，1 → `BOTTOM`；目录不存在就用另一侧。
- **Global Align**：三行，Light 1、2、3，Channel 是 `GlobalAlign` 的 `L1Channel`、`L2Channel`、`L3Channel` 的名字。**SR Align**：一行，Light = `SRAlign.Light + 1`，Channel = `SRAlign.Channel` 的名字。Unit 与 Dummy 相同。
- 通道名：0 Red，1 Green，2 Blue，4 Gray（和 SETTINGS 页的 `Application.xml` `<dmg Channel>` 一致：`4` → Gray，`0` → Red），其他数字写 `CH <n>`。
- Overlay：`mk: true`，其余 false（界面状态，没有 XML 来源）。
- **树**：由 `SpecTreeNodeList.xml` 决定结构与顺序，`SpecTreeNode.xml` 给名字与颜色。Unit 取 `gpnode ID=1`，Dummy 取 `ID=2`。节点 id：父节点 `u-p<pnodeID>`，子节点 `u-p<pnodeID>-c<cnodeID>`，Dummy 用前缀 `d-`。
- 颜色 → `tone`：取最近的参考色：root (188,143,143)、gold (255,201,14)、green (0,160,0)、silver (192,192,192)、violet (102,51,255)。
- `pnode ID=1`（Align / ROI）及其子节点没有复选框；它的子节点 `cnode 10 / 11 / 12` 带 `align: metal / sr / dmg`。其余节点的复选框 = `InspectionSpec.xml` 里对应 `PNODE`/`CNODE` 的 `NodeCheck`；三个灯各有一个值（`lightChecked`，下标 0 = Light-1），`checked` 取 Light-2 的值。文件里找不到该节点（或没有那个灯的文件）→ false。

## Image Analysis 三张表

节点 = `GPNODE` / `PNODE` / `CNODE`，三个灯分别读 `LIGHT0`、`LIGHT1`、`LIGHT2` 的 `InspectionSpec.xml`（Light-1、2、3）。父节点（`u-p3`）和找不到的节点：三张表都空。

| 表 | 取自 | 说明 |
|----|------|------|
| upper | `MASTER` | 去掉 `ParamKey=100`（Common 分组标记），文件顺序 |
| lower | `SUBMASTER` | 文件顺序 |
| channel | `INSPECTION` | Red / Green / Blue 页签分别取 `ValR` / `ValG` / `ValB`；`min` 分别取 `MinValR` / `MinValG` / `MinValB` |

每行：`no` 从 1 起；`name` = `SpecParameter.xml` 里英文（LangCode 0）文字去掉首尾空白，没有就写 `Param <ParamKey>`；`value`：`ControlType=1` → 布尔（`Val != 0`），其余 → `%.3f` 文字（`-2.000`）；`min` 只在 channel 表有，`%.3f`；`tone` 由 `SpecGroup` 决定：1、2 → `green`，3、4 → `yellow`，其余（0 与 5）→ `plain`。

行数上限（实测）：upper 9、lower 9、channel 22，现有面板版式装得下，不需要滚动。

## Median 图与 GV 测量

工作台中间的图是当前模型、当前灯的 Median 图（见 [20-workbench.md](20-workbench.md) 第 7 节）。`internal/inventory/median.go`：

- **PxRepository 在哪**：Connector 把主机的文件夹直接交给后端（`Hub.Inventory` 里 `SetRepoDir(<主机文件夹>/PxRepository)`），不再从 `PxInventory` 的位置去推。以前用 `filepath.Dir(<PxInventory>)` 推，主机存成 `\\192.168.1.61` 这种 UNC 服务器根时就错了：Windows 上 `\\host\PxInventory` 本身是一个“卷”，`Dir` 返回它自己，推出来的是不存在的 `\\host\PxInventory\PxRepository`，于是所有图（Metal / SR / Median）和仓库里的分辨率都找不到、报 “No Metal / SR picture found”。`Open` 里仍有个猜测（`siblingDir`，对 UNC 共享用卷名换最后一段），只给直接用 `Open` 的测试和工具用。Windows 上的真实行为由 `repodir_windows_test.go` 在 CI 的 Windows 机器上验证。
- 位置：`PxRepository/<模型>/` 下（模型名或去掉修订号的基名，不分大小写）名为 `MEDIAN` 的目录（`2.0/Line/Top/Layer/MEDIAN`），最深 8 层；有多个时先选路径里带本模型 Surface（`Top` / `Bottom`）的，再选路径里带**机台分辨率**（`Application.xml` 的 `Resolution`，其次是模型自己的分辨率）的——一个模型常有 `2.0` 和 `3.5` 两个目录，各有一份 MEDIAN——再选最浅的，再按名字。
- 文件：`Median_<a>_<b>_<c>.tif(f)`（不分大小写），`c` 是灯号 − 1。同一个灯有多个文件时取 `<a>` 最小、再 `<b>` 最小的。其他文件（`Thumbs.db` 等）忽略。参考数据（`FM1`/`FM2`/`BM` 相同）是 `Median_0_1_0..2.tif`：5860×4020、8 位灰度、未压缩。
- 找不到图时 `note` 说明找过哪里：模型在 `PxRepository` 里没有文件夹（写出仓库路径），或文件夹有但里面没有图（写出找过的文件夹）。界面把它显示在 “No Metal / SR picture found” / “No Median picture of Light-n” 下面，可以直接对照共享盘。
- `GetMedianView(light)`：`state` 为 `ok` 时带预览（每个预览像素 = 4×4 个 TIFF 像素的均值，PNG data URL，显示 781×536）、`size`（TIFF 尺寸）、`file`、`lights`（本模型有哪几个灯）；`missing`（没有这个灯的图）、`unreadable`（TIFF 解不开，`note` 说原因）时没有图，调用本身不报错。
- `MeasureGv(light, box)`：`box` 是 TIFF 像素的矩形（可带小数）；统计 `box` 向外取整并夹进图里（至少一个像素）的灰度：`pixels`、`mean`、`std`（总体）、`min`、`max`、`saturatedHigh`（=255）、`saturatedLow`（=0），以及实际量的 `box`。算法与 AFVI_TEACH 的 `core.MeasureGv` 相同。没有图时返回错误。
- **会话缓存（不再访问网络）**：仓库多半在 `\\host` 共享上，所以图片与它们的查找都只做一次。TIFF 用 `os.ReadFile` 一次读入再解码（不是边 seek 边读）；解码结果按路径缓存，总量 256 MB，超了丢最久没用的，刚请求的那张一定留下；命中时不 `stat`、不看修改时间。哪个模型有哪几个灯的文件（遍历 MEDIAN 目录）按模型记住；当前模型名与 Surface 也只问一次盘（`Select` 直接改内存里的当前模型）。Align 的 Metal / SR 合成图同理，按模型留最近 4 张。因此一个热会话里 `GetMedianView`、`MeasureGv`、保存 ROI 都零磁盘访问（`TestMedianNeedsNoDiskOnceLoaded` 把整个仓库和 `PxInventory` 删掉后还能继续量）。
- 唯一的刷新入口是 `Service.ReloadPictures()`：清掉解码缓存、文件查找、合成图和 Surface。`connector.Hub.Save` 在文件夹与主机都没变时（用户在 Connector 对话框里再点 Apply）调用它；变了就整个 `Service` 重建。共享上的图被替换后，Apply 一次或重启才会看到。永不写仓库。
- 参考数据（Light-1）整图：均值 31.03、标准差 20.39、范围 12..168（与 Pillow 独立量得的一致，见 `TestRealMedianPicture`）；Light-2 均值 18.10、范围 9..29（很暗，是真实数据）；Light-3 均值 52.37。

## 数据位置

后端只读 Connector 里选定主机的 `<路径>/PxInventory`（要有 `INSPECT_SPEC`）；配置、校验和切换见 [95-connector.md](95-connector.md)。

没有配置、路径失效或打不开时 Go 方法返回错误；Wails 窗口里的适配器退回模拟数据并在控制台写一行警告。不再有环境变量或自动查找。

## 已知限制

- Align / ROI 三个节点的图片仍是模拟图（`AlignData/*.tif` 还没有解码）。
- 复选框与表格里的开关只改界面状态，不写回 XML。
- 截图里的数值（Dark Defect 20、Remove SR Edge 6 等）不在这份 `design/repo` 里，界面以 XML 为准。
