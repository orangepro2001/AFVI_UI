# 60 Log in/out 对话框

来源：`design/reference/left-block-menu-login[no.2 icon].png`。整窗截图，偏移 dx=3、dy=2（图 − 设计）。点击左侧 rail 的第 2 个图标（`user`）打开。

## 遮罩与窗体

- 全窗口遮罩 `#353535`（`--dialog-veil`）@ 40%，盖住所有界面（含顶栏与日志）。
- 对话框 440×292，窗口居中，2px 边框 `border-dialog-border`（`#1c6b9a`）。
- 标题栏 18px，`bg-dialog-title`，文字 `text-2xs` 白，左内缩 8px；右上关闭按钮 22×18，`X` 图标 11px。
- 正文 270px 高（292 − 2×2 边框 − 18 标题栏），子元素以正文左上角绝对定位。`AppDialog.vue` 是通用壳，`features/session/LoginDialog.vue` 是内容。

## 内容（正文坐标）

- 用户列表框：左 6、上 5，425×167，`bg-muted`。框内（以框左上角为原点）：`Login - Users` 小标题 top 10 / left 4；表头 `Index`、`User name or ID`、`Level`、`State` 在 y=29.5 居中；数据行 y=47.5 起，行距 22，文字 `text-analysis-plain`。
- `User name or ID :`、`Password :` 两个白色标签右对齐到 x=192.5，中心 y=189 与 217。
- 两个输入框 232×22，left 199，top 178 与 206，`bg-dialog-field`；密码框右侧有可切换可见性的眼睛按钮（Show / Hide password）。
- `Logout` 与 `Cancel`：93×22，top 243，left 239 与 338，`bg-sheet-row`，边框 `border-dialog-line` / `border-dialog-line-dim`。

## 数据

`getSession()` → `SessionInfo { current, since, users }`。参考图里只有一行：`01  Admin  Master  Login`（Index / 用户名 / Level / State）；`since` 固定 `2026-10-20 16:35:23`，不随真实时钟变化（顶栏的登录时间也用它）。

## 行为

- 打开后焦点落在用户名输入框（`data-autofocus`）；关闭时清空输入与密码可见性。
- `Cancel`、标题栏关闭、点遮罩都关闭对话框。`Logout` 目前只是关闭——真正的登出要等 Go 后端提供。
- 开发预设：`?dialog=login`。

## 不确定项

登录状态没有“已登录”参考图，用户列表的 State 列只有模拟值；字体宽度与参考图略有差别。
