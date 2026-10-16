# 3.6.1 发布记录（2026-10-10）

本页是一次发布的证据索引，不是下一版的固定输入。下一版须重新确定真实版本、输入、历史缓存和授权范围。

2026-10-12：下述完整冻结资源树依赖已经从当前发布工具及回归测试移除。后续资源唯一源为 Latest，历史测试从正式 A／B ZIP 按需取旧文件；旧 `mod-root` 不再需要保留为工作依赖。历史发布事实和原字节记录保留，当前流程见 `latest-source.md`。旧树删除此次被环境策略拦截，尚未实际删除。

## 版本和当前事实

- 客户端内部版本 `3.6.1`，Electron `33.1.0`，Windows x64 自动更新；Mac ARM64 手动替换。
- MOD 内部版本 `3.6.1`，sequence `37`。本次签名资源索引的 displayVersion 是 `3.6.1`；官网公开产品文案继续 `3.6`，不另发维护版公告。
- 最终私有目录 `_irys/releases/v3.6-v3.6.1-20261010-r2/`。原 r1 的 `mod-root/` 是本次共享冻结资源树，不能因为 r2 存在就删除整个 r1 父目录。
- GitHub 两产品 `v3.6.1` 已公开并设为 latest。正式网站清单和两站技术门禁已部署；本目录 `site-after-release.json` 的 18 个真实 GET 核对通过：8 个新端点、8 个保持原字节的旧兼容端点、两站门禁。下一版仍须重新请求线上，不能只沿用本次记录。

## 下载页与发布布局

- 客户端 `https://github.com/UIZorrot/Quenching-Client/releases/tag/v3.6.1`：Win ZIP、Mac ZIP、校验文件，共 3 项。
- 完整包 `https://github.com/UIZorrot/Quenching-Assets/releases/tag/v3.6.1`：完整包 A/B、从 3.5 的手动覆盖 ZIP、从 3.6 的自动更新 ZIP、校验文件，共 5 项。
- 客户端机器产物另放 `v3.6.1-updates`，10 项：8 个整文件和 2 个可选差分。不要把它们堆进玩家便携下载页。
- MOD 新发布只上传每个资源过渡的一份普通 ZIP，不再传数百个散对象。A/B 都是独立可读 ZIP；自动 ZIP 带 payload 包装，不能当手动覆盖包解压。
- 旧 `3.6` 拥挤页面已标为 legacy prerelease，原资产和 URL 保留；旧数字 tag 不能删除或重命名来破坏签名链接。新的 canonical tag 使用 `v3.x`。
- GitHub 草稿返回的 `browser_download_url` 可能带 `untagged-*`。正式签名链接使用真实已建立的 tag；发布后重新核对 URL、资产 ID、大小与 SHA，保存正式记录，不拿草稿临时 URL 验证公开下载。

## 自动更新与兼容

客户端比较当前／最新官方清单，本次 3.6.0 → 3.6.1 有 8 个变化路径：EXE、ASAR、两份 shaders ZIP、两份 T20 SLK、更新助手、statics/package.json。差分不匹配或失败时只下载对应完整目标文件，不让官方旧哈希成为更新资格。

旧 3.5.0／3.5.1 的 schema 1 桥接保持目标 3.6.0；获得新协议后再读最新 3.6.1 索引。新索引的正式 baseline 是 3.6.0，不伪称旧代码能直接理解 schema 2，也不为以后每对版本建差分包。

MOD 连续 ZIP 为 3.4 → 3.5 → 3.6 → 3.6.1，分别需要 3／2／1 步（当前版本为 3.4／3.5／3.6 时）。每步提交及失败回滚，不检查玩家旧目录完全等于官方清单；保留 QMoff 状态和额外文件。3.4 特殊迁移 ZIP 由既有认证迁移内容重包，不重新扫描真实玩家目录。

测试 flag 与正式通道分离；测试通过不代表正式路由已部署。Mac 尚无自动更新承诺；R2 本次未启用。签名官网索引提供 GitHub 镜像策略，15 秒慢源观察和通过哈希验证后记住成功镜像的特性保持不变。

## 证据和官网交接

以下文件均在最终私有目录，凭据不进入仓库或客户端：

| 记录 | 用途 |
| --- | --- |
| `client-packages-verification.json` | Win 所有 459 个官方文件；两端 ASAR/关键资产与 ZIP；Mac 权限/结构，不代表 Mac 实机启动 |
| `full-package-verification.json` | 9,069 个官方资源；完整 A/B 和手动包逐项哈希 |
| `client-inventory-compatibility.json` | 正式旧 3.6.0 解码所需排序／摘要在八种语言的兼容验收 |
| `real-mod-34-chain-verification.json`、`real-mod-chain-verification.json` | 实际 ZIP 的隔离升级、QMoff 和额外玩家文件保留；不操作用户游戏 |
| `client-update-download-verification.json` | 10 个机器文件的生产下载器匿名 GET、大小/SHA、签名验证 |
| `public-archive-download-verification.json` | 8 个 ZIP 共 5,301,787,361 字节完整匿名 GET/SHA；流式校验不生成磁盘副本 |
| `github-files-uploaded.json`、`github-publication.json` | 最终正式 URL/ID/SHA，公开状态；正式基线不能当草稿清理 |
| `website-handoff.json`、`HANDOFF.md` | 原件路径、8 个 API/非 API URL、字节/SHA、响应头及门禁方案 |
| `site-before-release.json`、`site-before-release/` | 切换前线上原件；保留旧桥和旧 MOD 接口的比较基线 |
| `site-after-release.json` | 正式新清单/快照的准确字节与响应头、两站门禁，以及旧桥/旧 MOD 接口不变的 18 项线上核对 |

官网需原字节部署客户端 `latest.json`、MOD `mod-zip-manifest.json`、两份客户端 gzip 官方快照。latest/MOD index 使用 no-store；gzip 为 application/gzip，不能设置 Content-Encoding:gzip 导致透明解压；缺失文件真实 404，不返回 SPA。

门禁已部署为 `{schema:1,version:"v3.6",modVersion:"3.6.1",allowed:1}`，两站一致。网站允许公开版本与内部资源技术字段分开；未改签名清单去适配旧验证器。旧 MOD schema 1/2、两份旧客户端桥和原下载 URL 保持不变，公告未新增。发布端点和字节验收不等于在每台玩家电脑实机启动成功；Mac 仍只有结构校验记录。

## 这次私有工具

`publish-361-files.mjs`、`publish-361-github-pages.mjs`、`refresh-361-public-records.mjs`、`prepare-361-handoff.ts`、`verify-361-update-downloads.ts`、`verify-361-public-archives.ts`、`check-361-site.mjs` 均在忽略的 `_irys/`。可用 `QUENCHING_RELEASE_DIR` 指定本次目录，但部分工具仍锁定 3.6.1 的 ID／版本；下一版先检查／参数化，不直接照跑。

最终候选、真正分发的旧基线、持久 store 和官网回退原件保留；只清理确认废弃的独立测试／重复草稿 ZIP。运行中的测试目录先跳过，含 junction 的目录不递归清理到资产源。
