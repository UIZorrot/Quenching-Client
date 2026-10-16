# 客户端异常诊断（2026-10-13，未发布）

## 范围与结论

输入报告：`D:/txzy_website/qm-forum/docs/client-telemetry-crash-analysis-20261013.md`，快照北京时间 2026-10-13 00:44:05，过去 30 天。109 条相关事件是 91 条明确异常加 18 条窗口加载失败；不是所有 `app_crash` 都是已确认的崩溃。安装实例可重叠，不相加为用户数。

本轮确认并最小修复两个局部源码缺陷。窗口加载失败仅确认一种可复现的正常关闭触发条件；原生渲染退出缺少定位证据，没有碰运气修改。没有打包、上传、推送、提交、改变版本或线上清单，没有修改 Latest、客户端 assets、官网或埋点地址／协议／分类。

从磁盘根到仓库、以及 src/scripts 内未找到实体 AGENTS.md；遵循用户提供的 AGENTS 指令限制命令输出。工作区有大量既有未提交修改，保留了原有 Battle.net 路由、启动资源应用、战役、着色器及其他改动。HEAD 是 `35d5b14`（2026-10-04），不能代表当前已分发源码。

## 发布包核对

读取真正留存的 `__Bin/QMC3.6-Win.zip`，不重新解压整个客户端：

- ZIP 内部版本 `3.6.1`，外部文件名仍为 3.6。
- ZIP SHA-256 `26bfc5f3a12eb52e8ae04a3178b8723d24c47b76076691360f442d498c0b2e31`，与 `__Bin/netdisk-client-36-verification.json` 相符。
- `resources/app.asar` SHA-256 `66d9c754ef5096c9e1f2777c41da7e18ee04ecf645032231e74ed5dbc1c4f528`。
- 其 `dist/main.js` 确实包含论坛销毁回调中的 `window.webContents.removeListener(...)`，以及游戏直接 `spawn(...).unref()`、无异步 error 监听的旧逻辑。
- 核对的是这份真实 3.6.1 留存包，不是假定所有旧版本、所有玩家电脑的字节相同；没有重新取得每个 3.5／3.6.0 玩家构建。

私有读取工具：`_irys/inspect-published-telemetry-paths.mjs`，只读正式 ZIP，在内存中检查 ASAR；没有创建完整解压副本。

## 1. Object has been destroyed

日志事实：6 条／6 个安装实例，3.6.0 四条、3.6.1 两条；片段为 `WebContents.<anonymous> → Object.onceWrapper → WebContents.emit`，没有准确的玩家操作序列或源码行号。

源码确认：`src/Main/ipc/forum-handlers.ts` 的 `showForum` 为论坛 WebContents 注册一次性 destroyed 回调。主窗口关闭时，论坛随之关闭；该回调再读取已经销毁的 BrowserWindow 的 `webContents` getter，抛出异常。

修复前在真实 Electron 33.1.0 的隔离隐藏窗口中，打开本地论坛后销毁主窗口，复现了 `TypeError: Object has been destroyed`，三层堆栈与报告完全一致。它足以证明这条具体路径有缺陷，但不能证明服务器六条全部来自这一条路径。

最小修复：在窗口仍有效时保存 `ownerContents`，注册和移除监听都使用该 EventEmitter 引用。没有吞异常、关闭监听、修改论坛权限或访问策略，也没有到处增加空 catch。

代码位置：`src/Main/ipc/forum-handlers.ts:42`。正常论坛关闭、窗口关闭、页面刷新仍销毁论坛并解除监听。

## 2. 游戏启动 EACCES／ENOENT

日志事实：EACCES 15 条／9 个实例，ENOENT 1 条／1 个实例；进入主进程 uncaughtException，栈包含 `ChildProcess._handle.onexit`。不能凭它判断是哪款安全软件、哪个 ACL 或文件被移除的原因。

源码确认：`GameLauncher.launchGame`、`launchMap`、`unlockCampaign` 的直接启动路径只围绕 spawn 调用做 try/catch，然后立即 unref／返回成功。异步 error 事件发生在返回之后，既无法被该 catch 捕获，也没有子进程 error 监听。启动前已有所选分支、目录和可执行路径存在性检查；检查完成后仍可能启动失败。

修复前，用真实 GameLauncher 与异步子进程事件夹具复现：EACCES 时先返回 true，随后出现未捕获异常。

最小修复：`src/Main/services/game-launcher.ts:23` 中增加本地 `spawnGameProcess`，监听 error 并拒绝启动 Promise，仅在 spawn 成功后 unref／返回成功。三个入口的 Windows 与 macOS 直接路径使用它，原参数、cwd、detached、资源同步、分支及 Battle.net 逻辑不变。没有提高权限、强制管理员或变更可执行路径选择规则。

错误继续由现有 IPC 向界面返回：`src/Main/ipc/launch-handlers.ts:60`；首页 `src/Renderer/components/MainWindow/index.tsx:709` 显示失败提示，地图和战役组件已有 catch 提示。原来的 console.error 保留。没有更改埋点统计；修正的是可恢复错误不应逃出为未捕获异常。

`battle-net-launcher.ts` 已监听异步 error 并返回 false，保留其直接启动回退。这轮没有修改它。

## 3. window_load ERR_FAILED (-2)

日志事实：18 条／11 个实例，3.6.1 一条，指向本地打包入口。尚不能确定这些用户是正常关闭／加载中止、真实加载故障或其他原因。

实际复现：隔离 Electron 窗口调用 loadFile 加载一份确实存在的本地 HTML，完成前销毁窗口，Promise 拒绝为 `ERR_FAILED (-2) loading 'file:///...'`。论坛本地 HTTP 加载过程中关闭窗口也能返回同一代码。因此该代码本身不足以认定缺文件或网络故障。

未改 `initialize-main-window.ts` 的加载策略和 `recordStartupFailure`：不能把所有 -2 都当正常关闭忽略，也不能依据这一夹具推断 18 条的具体根因。进一步需要每个异常会话的开始／正常退出时间及既有 phase/reason/stack 聚合；如没有窗口关闭／加载中止先后记录，应明确为信息缺失，不伪造结论。

## 4. renderer crashed／launch-failed／oom

日志事实：crashed 57 条／14 实例、launch-failed 8 条／2 实例、oom 4 条／3 实例。没有可定位到原生模块／显卡调用的崩溃转储，也没有可靠的具体触发页面和操作。

本轮未改沙箱、GPU、驱动、硬件加速或其他全局开关。现有异常观察逻辑继续保存 reason／exitCode。未把旧版原生退出当作当前代码已经复现的故障，也未归因于官网迁移。

建议先补充脱敏聚合：按 version、platform、arch、osRelease、phase、reason、exitCode 分组的事件数／安装实例数；同一匿名会话相对 startup_success、正常退出的时序；重复退出是否集中在同一实例。不要传原始身份、用户路径、密码或 Token。若现有字段不足，下一轮另行取得用户同意的最小诊断记录或崩溃转储；本轮不添加采集协议。

## 正常退出与事件解释

源码把残留 running 会话推断为 `unclean_exit`，明确带 `inferred: true`；`quit_before_ready` 是 startup_failure。正常 ready 后退出会清空当前会话，不产生 app_crash。强杀、断电等可留下 running 记录，仅凭它不能定位程序 bug。

保持既有协议／分类，没有通过删事件或关闭上报制造“修复”。状态和上传回归还覆盖了明确主进程异常、渲染 crashed 和窗口加载失败保留。

## 本轮通过的验证

| 命令 | 实际覆盖 |
| --- | --- |
| `node scripts/test-forum-window-lifecycle.mjs` | 真实 Electron：三次打开／关闭、论坛开着时销毁主窗口、主窗口刷新、论坛加载中关闭、本地存在入口加载中关闭；无未捕获异常，加载失败仍返回 |
| `node scripts/test-forum-view.mjs` | 原论坛面板真实 Electron：打开、调整大小、刷新、隔离权限、重复关闭清理和会话重启持久化 |
| `node --import tsx scripts/test-game-launch-errors.ts` | 48 个服务分支：Win／模拟 Mac、Retail／PTR、游戏／地图／战役，正常 spawn、异步 EACCES、异步 ENOENT、同步抛错；错误对象保留、不提前报成功；真实 Windows ENOENT 经服务处理，真实 Node 进程正常启动及退出 |
| `node --import tsx scripts/test-battle-net-integration.ts` | 原 Battle.net／直接回退路由、资源应用顺序、关闭 MOD、显式 EXE、地图、解锁副本和源文件不变 |
| `node --import tsx scripts/test-battle-net-launch.ts` | 真实参数传输、中文路径、缺 Battle.net 回退和正常子进程 spawn |
| `node scripts/test-telemetry-exit-classification.mjs` | 正常退出／重启、提前退出、推断非正常退出、明确主进程／渲染异常、窗口加载失败分别保留；无真实进程钩子或上报 |
| `node scripts/test-startup-telemetry-state.mjs` | 原队列、匿名 ID、ACK、离线／超时、重启重试、并发追加事件保持；地址／协议不变 |
| `node --import tsx scripts/test-startup-telemetry-uploader.ts` | 原上传协议、ACK 和本地 HTTP 回归 |

限制：没有运行真实 Warcraft、没有在 Mac 硬件上运行、没有重建完整便携客户端或做玩家机器现场验证。Mac 启动错误分支是平台模拟，不是 macOS 实机验收。实际 Windows 的目录作为不可执行目标返回 ENOENT；EACCES 用异步事件模拟，未人为修改权限或归因于安全软件。以上测试不等于已发布用户已获得修复。

初版新增测试夹具有参数转换、正则转义及子进程退出等待问题；已修正夹具并重新运行至通过，未据测试夹具失败修改生产逻辑。修复前复现使用 `--expect-existing-error`，该模式仅供未修复源码验证，当前代码应运行不带此参数的回归。

## 实际改动清单

- 生产源码仅两处：`forum-handlers.ts` 保留 ownerContents；`game-launcher.ts` 的 spawn/error 等待。
- 原 `test-battle-net-integration.ts` 的模拟 child 从只有 unref 改为发出真实语义的 spawn 事件，以匹配异步启动验证。
- 新增三个针对性回归：论坛窗口生命周期、直接启动错误、退出事件解释；私有包检查脚本和本文。
- 未修改 `src/main.ts`、初始化窗口、全局设置、遥测源码、版本号、Latest 或发布产物。它们在 Git 中已有的其他改动不属于本轮。

## 后续 Windows 启动验收

用户随后要求检查 Windows 能否打开。`npm run pack` 编译当前源码通过（没有运行会修改着色器输入的 prepare-shader-bundles，也没有构建便携 ZIP）。用 `_irys/windows-startup-smoke.mjs` 在 Windows Electron 33.1.0 中启动真正的当前 dist 主程序、preload 和 renderer，使用独立空配置、userData 和正常单实例锁。

窗口可见，首页 30 个按钮和 preload API 均已加载；显示 12 秒后仍无主进程／渲染异常，正常关闭退出码 0。截图 `_irys/windows-startup-smoke-20261013.png`。未配置真实魔兽路径，没有启动游戏、应用资源或安装更新；夹具阻止后台注册表初始化和生产埋点上报，不改变生产代码。这是源码构建启动验收，尚未验收新的 QMClient.exe 便携分发包。

第一次夹具使用 windowsHide 导致首个原生窗口被 Windows 隐藏，界面实际已经加载。改为可见启动后通过；没有据此修改生产窗口逻辑。
