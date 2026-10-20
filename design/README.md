# design/

设计图和截图。完整流程见 [docs/UI_WORKFLOW.md](../docs/UI_WORKFLOW.md)。

- `reference/`：设计图原件，入库。一页一张，文件名对应路由：`home.png`、`teach.png`、`review.png`、`calibrate.png`、`settings.png`，另有 `top-toolbar-gv.png`、`top-toolbar-ruler.png`（工具栏与叠加物局部）、`right-block-1.png`、`right-block-2.png`（TEACH 右栏 Unit / Dummy）。约 1778×929 的窗口截图，顶部多裁了几个像素，叠加比对要带 dx/dy 偏移（见下表）。
- `spec/`：从设计图量出来的尺寸、坐标、数据，一页一份（`00-frame.md` 外壳与日志、`10-home.md`、`20-workbench.md`、`30-teach.md`、`40-panels.md`）。改界面先读它，量到新数值后同步改它。
- `snap/`：`scripts/snap.sh` 的输出和差异图，不入库。

| 参考图 | dx | dy |
| --- | --- | --- |
| home.png、settings.png | 0 | 0 |
| teach.png | 0 | 3 |
| calibrate.png | 1 | 3 |
| top-toolbar-ruler.png | 0 | 1 |
| top-toolbar-gv.png | 2 | 6 |
| review.png | 0 | 8 |

开发服务器把本目录以只读方式提供在 `/__design/` 下（仅开发模式，仅图片），所以叠加比对用 `?design=reference/teach.png&dx=0&dy=3`，不需要把图复制进 `frontend/public`。
