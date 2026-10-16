# 首次启动：app.asar.unpacked 中 package.json 缺失

2026-10-15。用户明确为刚解压后的首次启动，非自动更新后启动。

## 可以确认的范围

截图为主进程启动阶段 `ENOENT: no such file or directory, open .../resources/app.asar.unpacked/node_.../package.json`。调用栈位于 Node 的 `internalModuleReadJSON`、`readPackage`、`resolveExports`，说明依赖包元数据读取失败。截图省略了中间模块名，不能确认具体是哪个依赖，也不能仅凭截图判断缺失发生在下载、解压或解压后的文件处理。

这是客户端自身依赖的读取错误，尚未进入魔兽地图、CASC 内容读取或资源安装流程。

`app.asar` 中标记为 unpacked 的文件必须以同一相对路径放在 `app.asar.unpacked`。Electron 官方说明要求两者一起分发：[ASAR Archives](https://www.electronjs.org/docs/latest/tutorial/asar-archives)。

## 实际包审计

输入：

- 本地已解压 `__Bin/QMC3.6-Win/QMC3.6-Win`，实际内部版本 3.6.1。
- 网盘重命名包 `__Bin/QMC3.6-Win.zip`，实际内部版本 3.6.1。
- 已分发 GitHub 原件 `_irys/releases/v3.6-v3.6.1-20261010-r2/QMC3.6.1-Win.zip`。

三者的 ASAR 都声明 35 个外部文件，两份 ZIP 中全部存在，大小正确；已解压目录进一步逐项核对了 ASAR 自带 SHA-256，全部一致。

外部包描述文件为：

```text
resources/app.asar.unpacked/node_modules/@jamiephan/casclib/package.json
resources/app.asar.unpacked/node_modules/@jamiephan/stormlib/package.json
```

注意：这些路径是所审计包中的事实，不是断言玩家截图省略的路径必然就是其中之一。

已使用实际便携包的 `QMClient.exe`，设置 `ELECTRON_RUN_AS_NODE=1`，从 `app.asar/dist/main.js` 的解析位置加载 `@jamiephan/casclib` 和 `@jamiephan/stormlib`，并构造 Storage/Archive。两者通过。未运行应用主入口、打开用户设置或访问游戏目录。

旧的 3.6.0 初版 ZIP 在原候选路径已不存在，本次没有用新包替代旧版本来宣称旧包通过。用户目录名为 QMC3.6 也不能单独确定其内部版本。

审计记录：`_irys/work/client-unpacked-audit-20261015.json`。此记录只读 ZIP 中 ASAR 和 ZIP 目录，未原地改写已分发原件。

### 解析陷阱

ASAR 一个标记为 unpacked 的目录里仍可能有 packed 子文件。例如所审计包的嵌套 `node-addon-api/package.json` 有 `offset`、没有 `unpacked:true`，实际保存在 ASAR 里。检查器必须看文件节点自身标记，不能继承父目录标记后误报缺失。实际 Electron 加载验证已通过。

## 补充的发布工具

新增 `scripts/check-client-package.mjs`：

```powershell
node scripts/check-client-package.mjs __Bin/QMC3.6-Win/QMC3.6-Win
```

- 解析 ASAR 声明，核对外部文件存在、大小及可用的 SHA-256。
- 在 Windows 上使用该包自己的 EXE 加载两个原生模块。
- `--files-only` 只核对文件。
- 已接入私有 Windows ZIP 导出工具 `_irys/export-win-test.mjs`，导出前运行。
- 只在发布验收或人工诊断时调用，不在玩家启动时全量扫描文件。

新增 `scripts/test-client-package.mjs`，真实 Electron 小型隔离 ASAR 测试：

1. 原始依赖元数据在 unpacked，JS 同级文件仍在 ASAR，正常加载。
2. 移除外部 package.json，复现 `ENOENT`、`app.asar.unpacked`、`package.json` 错误；检查器准确指出缺失相对路径。
3. 写入同长度错误内容，检查器报告 SHA-256 不匹配。
4. 恢复原文件，Electron 再次正常加载。

此项测试与真实 3.6.1 包检查均通过。没有修改客户端启动逻辑、打包新版本或更换线上 ZIP。

## 给用户的恢复办法

使用官方完整 Windows 客户端 ZIP，将全部内容解压到一个新的空文件夹，从解压目录运行 QMClient.exe；保留同包的 resources/app.asar 和 resources/app.asar.unpacked 配套。仅有 EXE 或 ASAR 无法恢复这类缺失。

如果同一 ZIP 完整重解压后仍出现此错误，继续取完整错误文字和实际缺失路径，并核对下载 ZIP 哈希、解压器错误记录及文件是否被移除；不根据这张截断截图随意更换依赖版本。
