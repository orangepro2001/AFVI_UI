# 96 · 操作留档（journal）

应用把用户这一次运行里做过的事记成一个 XML 文件，一次运行一个，留在用户数据目录里存档。用来回答“这个型号上什么时候做了什么”。实现：`internal/journal`（写文件、修复、清理）→ `app.go`（`RecordOps` 导出给前端；Go 自己的操作直接写）→ `frontend/src/journal/`（收集、批量、发送）。

## 文件

- 位置：`%AppData%\AFVI-UI\journal\<开始时间>.xml`，如 `20261023-184412.xml`（同一秒再启动加 `-1`、`-2`…）。开发时 `scripts/devapi.go` 写 `.dev/journal/`（git 忽略），测试写临时目录；**开发和测试从不碰已安装应用的目录**。
- 每个会话一个文件，全部留着；启动时只删最旧的，使总数不超过 500 个。一次会话最多 200000 行，超出写一行 `journal.capped` 后不再记。
- 不写路径：Connector 只记主机 id（`FM1`），不记文件夹。值最长 400 个字符，超出截断并加 `…`。

## 格式（高密度）

属性式，一行一条，属性按名字排序，全文是合法 XML：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<journal v="1" app="AFVI-UI" ver="dev" os="windows/amd64" start="2026-10-23T18:44:12.381+09:00">
<o t="18894" k="nav" page="/teach"/>
<o t="19333" k="tool" name="gv"/>
<o t="20348" k="gv" h="804" light="1" max="162" mean="40.811" min="13" px="942288" std="37.737" w="1172" x="1758" y="1205"/>
</journal>
```

- `t`：开始后的毫秒数（前端事件按前端的时钟换算）；`k`：操作的种类。其余属性是这一种的细节。`t` 与 `k` 是行自己的，发送方用了这两个名字会变成 `x.t`、`x.k`。
- 行按写入顺序；同一批里按 `t` 排好。需要“拖动结束时的值”的操作（框、线、滑块）在**停下 0.5 秒后**才写，时间取最后一次变动的时刻，所以中途的每一步不会写。
- 写入即刷新到操作系统。正常退出写 `</journal>`；崩溃或断电留下的文件，下一次启动时补一行 `<o k="session.unclosed"/>` 和结尾（半行也会被截掉），所以存档里的每个文件都能被 XML 解析器读。

## 种类

由 Go 写（权威结果，前端不重复）：

| k | 属性 | 何时 |
| --- | --- | --- |
| `session.start` / `session.end` | `host` | 窗口启动 / 关闭 |
| `model.select` / `model.select.fail` | `name`（`err`） | 模型对话框 Apply |
| `connector.save` / `.fail` | `active`、`hosts`（`err`） | Connector 对话框 Apply |
| `roi.save` / `.fail` | `model`、`n`、`rois`=`id:x,y,w,h;…`（`err`） | Metal ROI 保存 |
| `roi.reset` / `.fail` | `model`、`n`（`err`） | 恢复机台 ROI |

由前端写（`journal/observe.ts` 列出全部；`journal/recorder.ts` 批量，约 1 秒一批，窗口隐藏或关闭时立即发完，发不出去会按顺序重试，积压超过 5000 条丢最旧的并记 `journal.dropped`）：

| k | 属性 | 何时 |
| --- | --- | --- |
| `ui.ready` | `w`、`h` | 界面起来 |
| `nav` | `page` | 换页（路由） |
| `rail`、`fullscreen` | `id` | 点左侧 rail 的按钮 / 全屏 |
| `dialog` | `name`、`open` | 七个对话框 / 面板打开、关闭 |
| `median.save`、`generate.confirm` | `lights`、`n`、`cells` / `light`、`mt`、`sr` | 这两个对话框的确认（目前没人消费） |
| `tool`、`light`、`channel`、`view` | `name` / `n` | 工具栏 |
| `gv` / `gv.clear` / `gv.tool` | `light`、`x y w h`、`mean std min max px` / `name` | GV 框（停下后）、清除、工具列的 select / rect |
| `ruler` / `ruler.clear` | `x1 y1 x2 y2 len` | 量尺线（停下后）、清除 |
| `node.select`、`node.check`、`overlay`、`row.toggle` | `id`、`light`、`on` … | TEACH 的规格树、复选框、Overlay、分析表开关 |
| `spec.mode`、`teach.section`、`teach.light`、`teach.channel` | `name` / `n` | TEACH 面板的页签 |
| `roi.select`、`roi.tool`、`roi.add`、`roi.edit`、`roi.del`、`roi.undo` | `id`、`x y w h` | Align ROI 编辑 |
| `cal.channel`、`cal.brightness`、`cal.enable`、`cal.page` | `channel`、`value`、`on`、`n` | CALIBRATE（亮度滑块停下后才写） |
| `mask.*`、`insp.light`、`align.light` | `mask`、`value`、`on`、`light`… | SETTINGS（滑块停下后才写） |
| `config.set` | `key`、`value` | 设置面板改值 |

不记：鼠标移动、拖动的中间值、只读数据的加载、Go 已经写过的。要加一种操作：在 `journal/observe.ts` 的 `actionRules` 加一条（动作名由测试保证真的存在），或在组件里 `record(kind, attrs)`（`@/journal`）。

## 还没有的

- 没有查看器：存档只是文件，用文本编辑器或任何 XML 工具打开。
- 不上传、不同步。
