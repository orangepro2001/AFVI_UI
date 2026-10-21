# design/

设计图和截图。完整流程见 [docs/UI_WORKFLOW.md](../docs/UI_WORKFLOW.md)。

- `reference/`：设计图原件，入库。一页一张，文件名对应路由：`home.png`、`teach.png`、`review.png`、`calibrate.png`、`settings.png`，另有 `top-toolbar-gv.png`、`top-toolbar-ruler.png`（工具栏与叠加物局部）、`right-block-1.png`、`right-block-2.png`（TEACH 右栏 Unit / Dummy）、`right-block-AlignROI-{Metal,SR,DMG}.png`（选中 Align 节点的整窗）、`right-block-AlignROI-[AU~OSP]…png`、`right-block-NonMetal…png`、`right-block-AlignROI-etc-UserMask.png`（右栏分析区局部）、`left-block-menu-login[no.2 icon].png`（登录对话框整窗）、`left-block-model-select[no.4 icon].png`、`left-block-menu-image[no.5 icon].png`、`left-block-menu-Cam-Generate[no.6 icon].png`、`left-block-menu-Align[no.7 icon]…png`（rail 第 4~7 个图标触发的全局对话框与加载遮罩，不属于 HOME 页）、`left-block-menu-setting[no.12 icon].png`（第 12 个图标：右缘的设置面板）、`left-block-menu-median-image[no. icon].png`（Median 对话框，图标编号未知，暂挂第 9 个）；这两张也是在 CALIBRATE 上截的，同样是全局的。约 1778×929 的窗口截图，顶部多裁了几个像素，叠加比对要带 dx/dy 偏移（见下表）。
- `spec/`：从设计图量出来的尺寸、坐标、数据，一页一份（`00-frame.md` 外壳与日志、`10-home.md`、`20-workbench.md`、`30-teach.md`、`40-panels.md`、`50-teach-nodes.md` 选中节点后的查看器与分析表、`60-login.md` 登录对话框、`70-global-dialogs.md` rail 触发的全局对话框与加载遮罩、`80-config-median.md` 设置面板与 Median 对话框）。改界面先读它，量到新数值后同步改它。
- `snap/`：`scripts/snap.sh` 的输出和差异图，不入库。

| 参考图 | dx | dy |
| --- | --- | --- |
| home.png、settings.png | 0 | 0 |
| teach.png | 0 | 3 |
| calibrate.png | 1 | 3 |
| top-toolbar-ruler.png | 0 | 1 |
| top-toolbar-gv.png | 2 | 6 |
| review.png | 0 | 8 |
| right-block-AlignROI-Metal.png | 5 | 6 |
| right-block-AlignROI-SR.png | 3 | 4 |
| right-block-AlignROI-DMG.png | 2 | 7 |
| left-block-menu-login[no.2 icon].png | 3 | 2 |
| left-block-model-select[no.4 icon].png | 2 | 2 |
| left-block-menu-image[no.5 icon].png（顶部带 20px Windows 标题栏） | 2 | 22 |
| left-block-menu-Cam-Generate[no.6 icon].png | 1 | 3 |
| left-block-menu-Align[no.7 icon]…png | 5 | 3 |
| left-block-menu-setting[no.12 icon].png（整窗有 40% 遮罩） | 3~4 | 4~5 |
| left-block-menu-median-image[no. icon].png（窗口窄 2px，居中的对话框实测 dx=1） | 2 | 4 |

后四张整窗图的客户区约 1778×925，截图用 `scripts/snap.sh --size 1778x925`。三张右栏局部图（AU~OSP、NonMetal、User Mask）是裁剪图，比对时参考坐标 = 我们的右栏坐标 + (−1270, −59) / (−1271, −63) / (−1270, −57)，详见 `spec/50-teach-nodes.md`。

开发服务器把本目录以只读方式提供在 `/__design/` 下（仅开发模式，仅图片），所以叠加比对用 `?design=reference/teach.png&dx=0&dy=3`，不需要把图复制进 `frontend/public`。

开发预设（仅开发模式）让页面直接进入参考图的状态：`?tool=gv|ruler`、`?spec=dummy`、`?node=metal|sr|dmg|pad|nonmetal|user-mask|<节点 id>`、`?pointer=x,y`、`?dialog=login|model|grab|generate|median|config`、`?busy=1`、`?scroll=bottom|<px>`。例如 `--query 'node=metal&pointer=2734,2484'`。
