# 本轮客户端修复与提交汇总

整理日期：2026-10-17。当前源码内部版本 3.6.1；本次是代码提交与推送，不是新版本发布，不替换线上下载包或更新清单。

Git 上一轮保存的是 3.5 基线。本次整理包括后续已完成的客户端变更、必要资源、回归测试及以下新增修复。这里的“已完成”指实现和所列回归，不代替所有游戏版本的实机验收。

## 已完成的修复与相关调整

| 项目 | 实现与证据 |
| --- | --- |
| W3N 导入失败 | 地图与战役两层合并都跳过 MPQ 内部索引、签名和属性条目；由 StormLib 重建索引。保留普通同名文件覆盖，排除嵌套 W3X/W3M，失败时释放文件句柄。见 `campaign-w3n-listfile-fix-2026-10-15.md`。 |
| Windows 中文路径 CASC | 共用临时 ASCII 目录连接读取入口；模型预览、单位皮肤基准、自定义涂装、反和谐统一接入。并发预览共用初始化过程，保留原始错误。见 `casc-unicode-path-2026-10-11.md`。 |
| Hive 自定义模型缺内置贴图 | 为省略目录的贴图及旧 EnvironmentMap 路径增加直接候选；按所选 SD/HD/DE 查询，导入副本写入真实引用，保留下载原件和自带同名自定义贴图。图标、头像及预览选择也有配套修复。见 `custom-skin-stock-textures-2026-10-11.md`。 |
| 版本、画质、皮肤实际切换 | 自动检测版本后应用对应资源；画质默认 HD、手动选择。SD 保留皮肤用途；DE 停放非目标资源、切入默认原版树木，并保留手动选择。2.x/3.x 单位及可破坏物基准分开，保留淬火的字段修改。 |
| DE 地形与 SLK | 各地形选项使用完整 SLK，T30 只重定向已有 diffuse 的纹理，其他回到原生资源。保留悬崖映射、原版水与树木规则。完整包纹理补充此前在 Latest 中完成，本客户端 Git 不携带 Latest 仓库的提交。见 `de-terrain-path-findings-2026-10-08.md`。 |
| 着色器与对战光照 | 3.0.0 使用已知兼容资源，3.0.1+、PTR 按分支和 HD/DE/光照模式选档；RPG、melee 与后处理开关正确映射。保留对战亮度及昼夜差距调整；资源 ZIP 随源码保存并在构建时生成。 |
| 完整包安装与分支 | 目录选择与安装流程关联；支持单个 ZIP、多个 ZIP、已解压文件夹及普通覆盖，不重复解包检查；分支真实存在才可启动/操作。安装与 MOD 开关分别处理，保留 QMoff 和第三方资源状态。 |
| 自动更新与下载 | 客户端按官方快照比较、变化文件更新及差分失败回退；MOD 连续普通 ZIP 更新；签名和哈希验证、中文安装路径、ASAR 原始字节读写、重启健康确认、失败回滚、测试与正式通道隔离。见 `file-sync-updates.md`、`mod-zip-updates.md` 等。 |
| 启动和论坛异常 | 子进程异步启动失败正常返回界面，不提前报成功；修复论坛窗口关闭/主窗口销毁后的对象访问和清理。启动资源操作有顺序协调；保留真实异常上报和正常退出分类。见 `client-telemetry-diagnosis-20261013.md`。 |
| 界面、主题与语言 | 完整包引导、新闻、涂装面板与多语言补词；主题“应用于魔兽”默认开启，可仅作用客户端，去除重复滚动区域；论坛入口已加入。 |
| Windows 包完整性验收 | 根据 ASAR 文件节点核对 unpacked 文件大小和 SHA-256，并用实际便携 EXE 加载 CASC/StormLib；隔离复现元数据缺失/损坏并验证恢复。只在发布验收或人工诊断中运行。见 `client-unpacked-startup-2026-10-15.md`。 |
| Mac 构建准备 | 原生模块源码准备、Darwin 架构验证、包内加载测试、ad hoc 签名与保留权限的 ZIP 流程，提供手动触发 macOS CI。签名工具固定 1.3.1，与锁文件一致。实际 Mac 构建/运行仍待验证。 |

## 未确认或未完成的事项

- `orcx03a` 在 HD 淬火地形下仅读档黑地面：原版地图与维护资源已静态核对，没有缺失所需纹理的证据；没有玩家故障存档，未确认根因，用户已要求暂时搁置。
- 编辑器另存地图后反和谐失效：缺少另存后的地图，未确认具体变更，不标记为已解决。
- 玩家首次启动 `app.asar.unpacked/.../package.json` 缺失：已复现同类缺失错误；手头的正式 3.6.1 ZIP、同内容 3.6 网盘 ZIP 和本机模块加载通过。截图省略具体依赖名，不能确认玩家文件在哪一步缺失。
- Mac Gatekeeper 正常信任需要 Developer ID/公证等条件；ad hoc 不等于公证。此次未在 Windows 上声称完成 Mac 实机验收。

## 本次提交前回归

26 个测试入口通过：

- 资源/启动：`test-casc-storage.ts`、`test-model-resource-layers.ts`、`test-version-skin-service.ts`、`test-anti-harmony-casc-path.ts`、`test-custom-skin-textures.ts`、`test-campaign-w3n-merge.ts`、`test-game-launch-errors.ts`、`test-battle-net-integration.ts`。
- 安装/画质/界面：`test-full-package-archives.ts`、`test-full-package-switch-state.ts`、`test-graphics-settings-transition.ts`、`test-theme-apply-scope.ts`、`test-destructable-skin-versions.ts`、`test-skin-i18n.ts`、`test-startup-telemetry-uploader.ts`。
- 包/真实 Electron/语言：`test-client-package.mjs`、`test-mac-native-packaging.mjs`、`test-forum-window-lifecycle.mjs`、`test-telemetry-exit-classification.mjs`、`test-client-update-asar.mjs`、`test-client-update-unicode.mjs`、`check-i18n.mjs`。
- 文件同步入口：`test-file-sync-node.mjs` 默认测试，以及 `test-mod-zip.ts`、`test-client-update-fallback.ts`、`test-update-channel.ts --real-gate`。

可破坏物回归的旧夹具缺少新增的 shader override 导出和 3.0.0 legacy shader 目录，已补齐夹具后通过，没有放松资源断言。

完整生产构建 `npm run build` 通过，日志保存在本地 `_irys/work/commit-production-build-20261017.log`。详细日志、已分发 ZIP、上传身份、私钥和工作区实验目录不进入本次客户端提交。
