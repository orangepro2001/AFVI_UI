# 95 Connector：三台主机的数据路径与切换

没有设计图（rail 第 3 个图标 `share`，参考图里红框那个，叫 Connector）。对话框的外观沿用 `AppDialog` 壳（440×292，2px 蓝框，18px 标题条），风格与 Choose Model Names 一致即可。

## 目标

1. 点 rail 的 Connector（`id: share`）弹出对话框，引导用户为 **FM1、FM2、BM** 三台主机各配一个文件夹。
2. 文件夹必须**直接**包含目录 `PxInventory` 和 `PxRepository`（不是上一级、不是下一级），不满足就拒绝，并说明缺什么。
3. 用户在三台里选一台作为当前主机（Active）。此后应用里**所有**读 model / inventory 参数的功能（`GetModels`、`GetActiveModel`、`SelectModel`、`GetTeachSpec`、`GetNodeAnalysis`）都读这台主机的 `<路径>/PxInventory`。
4. 删除环境变量注入（`AFVI_INVENTORY`、`AFVI_MACHINE`）和“从工作目录/exe 目录往上找”的自动发现。配置存在本地 JSON 文件（文件数据库）里。

## 配置文件（本地文件数据库）

- 位置：`os.UserConfigDir()/AFVI-UI/connector.json`（Windows：`%AppData%\AFVI-UI\connector.json`）。`connector.DefaultFile()` 返回它；取不到配置目录时 `NewApp` 退回只在内存里保存的 Store（文件名为空）。
- 内容：

```json
{
  "version": 1,
  "active": "FM1",
  "paths": { "FM1": "D:\\AFVI\\FM1", "FM2": "", "BM": "" }
}
```

- 读：文件不存在、为空或不是合法 JSON → 当作“全部未配置”（不报错）。读到的 `active` 不在 `Machines` 里就当空。
- 写：先写同目录临时文件再改名（原子替换），目录不存在就创建。写失败返回错误，内存里的配置不变。
- `Store` 只管读写这个文件（`Load() (Data, error)`、`Save(Data) error`），`Data{Version int; Active string; Paths map[string]string}`。

## 文件夹检查 `connector.Check(path) PathCheck`

纯函数，先 `strings.TrimSpace`：

| 情况 | `Message` |
| --- | --- |
| 空 | `path is empty` |
| 不是绝对路径（`filepath.IsAbs`） | `path must be absolute` |
| 不存在 | `folder not found` |
| 没有权限 | `access denied` |
| 其他系统错误（例如路径中间有文件、共享名不存在、用户名密码错） | `cannot open folder: <系统给的文字>` |
| 存在但不是目录 | `not a folder` |
| 缺 `PxInventory` 目录 | `PxInventory is missing` |
| 缺 `PxRepository` 目录 | `PxRepository is missing` |
| 两个都缺 | `PxInventory and PxRepository are missing` |
| 都在 | `OK: true`，`Message` 为空 |

`PxInventory` / `PxRepository` 必须是**目录**（同名文件不算）。

**网络路径（SMB）：** `\\服务器\共享\目录` 这类 UNC 路径和普通路径一样可用（用的是当前 Windows 登录会话已有的凭据，程序不保存用户名密码）。**UNC 服务器根**（`\\192.168.1.63`、`\\192.168.1.63\`、`//192.168.1.63/`）在 Windows 的文件接口里不是目录，而是该服务器的共享列表，`stat` 会失败（`The specified path is invalid.`）。当 `PxInventory` 和 `PxRepository` 本身就是这台服务器上的两个共享时（`\\服务器\PxInventory`、`\\服务器\PxRepository`），服务器根就是“直接包含这两个文件夹”的那一级，所以在 Windows 上服务器根**被接受**：不对根做 `stat` 和绝对路径判断，只检查两个共享。先 `stat` `\\服务器\PxInventory`，是“不存在”（Windows 的 `The network path was not found.`，服务器不可达或主机名不对）→ `network path not found`；共享不存在（`The network name cannot be found.`）按缺失处理。非 Windows 上不接受服务器根（`\\host` 不是绝对路径）。选择框（Browse）选不到服务器根，只能手动输入。

保存的路径用 `connector.Normalize`：trim 后 `filepath.Clean`，UNC 服务器根统一成 `\\host`（去掉末尾分隔符、`/` 换成 `\`）。

不检查 `INSPECT_SPEC`：`inventory.Open` 打不开时会在读数据时报错。

## `connector.Hub`

`Hub` 把 Store、校验和当前主机的 `inventory.Service` 绑在一起，`App`（Wails）和 `scripts/devapi.go` 都只通过它：

```go
func NewHub(store *Store) *Hub
func (h *Hub) Config() Config                         // 三台主机 + Active；每次重新检查路径，Status 是现查的
func (h *Hub) Save(in SaveInput) (Config, error)      // 校验并保存，成功后返回新的 Config
func (h *Hub) Inventory() (*inventory.Service, error) // 当前主机的 Service
```

- 配置第一次用到时从 Store 读入并缓存在内存里（Hub 是唯一的写入者）。
- `Save` 规则（任何一条不满足：不保存任何东西，返回带主机名的错误，如 `FM2: PxRepository is missing`）：
  - `in.Machines` 里每个 id 必须在 `Machines` 里（否则 `unknown machine "X"`）；路径空 → 清掉该主机，非空 → `Check` 必须 OK。`in.Machines` 没提到的主机保持原路径。保存的路径用 `Normalize(path)`（见上）。
  - `in.Active` 必须是一台**有路径**的主机（`FM2 has no folder`）；只有在保存之后三台都没有路径时才允许 `Active == ""`，否则空的 Active 报错 `choose the host to read`。
  - 路径或 Active 变了就丢掉已打开的 Service（下一次 `Inventory()` 重新打开，当前 model 回到默认）；没变就保留（不丢用户选的 model）。
- `Inventory()`：没有 Active → `ErrNotConfigured`（`connector: no host is configured`）；Active 的路径检查不过 → `<ID>: <Message>`；否则 `inventory.Open(filepath.Join(path, "PxInventory"))`，成功就缓存（键 = Active + 路径）。打开失败不缓存，下次再试。
- 并发安全（Wails 会在多个 goroutine 里同时调用）：`go test -race`。
- `Config()` 的 `Status`：路径空 → `unset`；`Check` OK → `ok`；否则 `invalid`，`Message` 取检查的说明。

## inventory 包的改动

- 删除 `Discover`、`discover`、`maxParents`、`Lazy`（`lazy.go`、`lazy_test.go`）和测试里的 `TestDiscover`；不再有任何 `os.Getenv`。保留 `ErrNotFound`、`resolveInventory`、`isDir`、`Open`。
- 以后谁要 `*inventory.Service` 就问 `Hub.Inventory()`。

## Go 导出（`app.go`，Wails 绑定）

| 方法 | 说明 |
| --- | --- |
| `GetConnector() connector.Config` | 对话框打开时取 |
| `CheckMachinePath(path string) connector.PathCheck` | 实时校验一个文件夹 |
| `SaveConnector(in connector.SaveInput) (connector.Config, error)` | Apply |
| `PickFolder(startDir string) (string, error)` | `runtime.OpenDirectoryDialog`；`startDir` 是目录就作为起始目录；取消返回 `""`；`a.ctx == nil`（测试）返回错误 `no window` |
| `GetModels` / `GetActiveModel` / `SelectModel` / `GetTeachSpec` / `GetNodeAnalysis` | 不变，只是 Service 来自 `a.hub.Inventory()` |

`NewApp(version)` 创建 Hub：`connector.DefaultFile()` 成功用文件 Store，失败用 `connector.NewStore("")`（只在内存）。测试里要能注入 Hub（例如 `newAppWith(version, hub)`）。

## 开发用 HTTP（`scripts/devapi.go`）

- 参数：`-addr`（默认 `127.0.0.1:8099`）、`-config <文件>`（Store 文件，默认 `connector.DefaultFile()`）。**删除 `-inventory` 参数。**
- 路由：原来的五个 GET 不变；新增 `GET /api/GetConnector`、`GET /api/CheckMachinePath?path=`、`POST /api/SaveConnector`（请求体是 `SaveInput` 的 JSON）、`GET /api/PickFolder`（总是返回错误 `the folder dialog is only available in the app window`）。错误仍是 `{"error": "..."}` + 500。CORS 允许 `GET, POST, OPTIONS`。

## 前端契约

`api/types.ts` 与 `api/client.ts` 已冻结（`MachineId`、`PathCheck`、`ConnectorMachine`、`ConnectorConfig`、`ConnectorInput`；`getConnector`、`checkMachinePath`、`saveConnector`、`pickFolder`）。

- Connector 的四个方法**不退回模拟数据**：Go 的错误原样抛给对话框显示（`api/connector.ts` 的 `createConnectorApi(calls)` 只做显式挑选，不能把 `getModels` 等带进来）。其余五个 inventory 方法保持现在的退回逻辑。
- 模拟后端（浏览器里没有 Go）：内存里的配置，初始 FM1 = `D:\AFVI\FM1`（`ok`）、FM2/BM 未配置、Active = `FM1`；`checkMachinePath`：空 → `path is empty`，不是绝对路径（既不以 `/` 开头也不匹配 `^[A-Za-z]:[\\/]`）→ `path must be absolute`，其余 → ok；`saveConnector` 按上面 `Save` 的规则校验并保存；`pickFolder` 返回 `""`（取消）。

## 对话框 `features/dialogs/ConnectorDialog.vue`

`AppDialog` 壳，标题 `Connector`。正文（坐标是正文内，原点在标题条下）：

- 提示行（`left 6, top 6`，`text-2xs`，暗色）：`Choose the folder of each host. It must contain PxInventory and PxRepository.`
- 面板 `left 6, top 36, 424 × 199`：标题条 18px（`bg-sheet-head`，`Hosts`）+ 2px 横线（`bg-dialog-list-rule`）+ 三行主机，每行约 52px：
  - 行内第一排：单选圆点（选当前主机）、主机名（`FM1`）、路径输入框、`Browse…` 按钮。
  - 第二排（输入框下）：状态文字：`ok` 绿色（`OK`）、`invalid`/校验失败红色（显示 `Message`）、未配置暗色（`Not configured`）。
  - 单选只能选**有路径且通过校验**的主机；选中的主机行高亮（`bg-dialog-border/45`）。
- 左下：保存失败的错误文字（`left 6, top 243`，红色，宽 220，超长截断）。
- 按钮：`Apply`（`left 239, top 243`）、`Cancel`（`left 338, top 243`，`primary`），同 `DialogButton`。
- 行为：
  - 每次打开：`api.getConnector()` 取配置，草稿 = 配置；取不到就空草稿并在错误处显示原因；有任一台是 `invalid` 也照样显示（状态红字）。
  - 路径输入框失焦 / 回车 → `api.checkMachinePath` 实时校验，结果显示在第二排；空路径 → 未配置（该行单选取消）。`Browse…` → `api.pickFolder(当前路径)`，非空就填入并校验，抛错就把原因显示在该行第二排（浏览器开发时没有窗口）。
  - `Apply` 可用：草稿里每个非空路径都通过校验，且 Active 是有路径的主机；没有配置任何主机时不可用。点击 → `api.saveConnector(draft)`；成功 → 发出 `applied`（载荷是返回的 `ConnectorConfig`）并关闭；失败 → 留在对话框，错误显示在左下。保存中禁用按钮。
  - 打开/关闭竞态：与 ModelSelectDialog 一样用序号防止旧请求覆盖新状态。
- 开发预设：`?dialog=connector` 打开它（`dev/preset.ts`）。

## 打开与联动

- `stores/app.ts`：`connectorOpen`；`inventoryEpoch`（数字，每次 `reloadInventory()` 加 1）；`reloadInventory()`：`model.value = await api.getActiveModel()` 然后 `inventoryEpoch++`。
- `AppShell.vue`：rail `share` → `app.connectorOpen = true`；`<ConnectorDialog v-model:open="app.connectorOpen" @applied="app.reloadInventory()" />`。
- `stores/teach.ts`：模型名**或** `inventoryEpoch` 变了就重载（切换主机后即使 model 同名，TEACH 也要换成新主机的数据）；第一次从 `null` 到有值仍不重载。
- `ModelSelectDialog` 每次打开本来就重新取 `getModels()`，不用改。

## 已知限制

- 切换主机后当前 model 回到那台主机的默认 model（Application.xml 的 `Model`），用户之前在另一台里选的 model 不记。
- 保存的路径指向 Windows 盘符时只能在 Windows 上用；在 WSL 里开发用 Linux 路径（`/home/.../design/repo/FM1`）。
- 配置文件不加密、不同步；多个应用实例同时写同一个文件时后写的覆盖先写的。
