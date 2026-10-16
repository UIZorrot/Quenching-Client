# W3N 导入：写入 (listfile) 失败

2026-10-15。源码修复，尚未打包发布。

## 玩家截图

客户端 `campaign:extract-w3n` 报错 `Failed to add file: D:\QuenchingTemp\campaign-...\out\_merge_work\slot_0\extract\(listfile)`。

这条路径表明 W3N 已开始提取，在第一张地图的共享资源合并阶段失败。`(listfile)` 是 MPQ 自己的目录索引，不是玩家放错的贴图，也不是魔兽 CASC 解析错误。

## 原因与修复

`src/Main/services/campaign-w3n-merge.ts` 原本只在战役共享列表中排除 MPQ 内部条目。地图自身的列表没有过滤，遇到将 `(listfile)` 自己列入目录的地图，会调用普通 `addFile` 写入这个条目。

StormLib 的 [SFileAddFile.cpp](https://github.com/ladislav-zezula/StormLib/blob/master/src/SFileAddFile.cpp) 明确拒绝以内部文件名新增普通文件，返回 `ERROR_INTERNAL_FILE`。Node 绑定将其转换为截图中的异常。

本次修改：

- 两层列表统一排除根级 `(listfile)`、`(attributes)`、`(signature)`、`(patch_metadata)`，忽略大小写。
- 由 StormLib 在 flush/close 时生成实际合并内容的索引；不复制旧签名和旧校验记录。
- 普通资源继续按原有替换规则写入。`textures/(listfile).blp` 这种普通文件不会误删。
- 战役共享列表同时排除 `.w3x`、`.w3m` 地图；原先 `.w3m` 会被当作共享资源再次塞进每张地图。
- 地图源档案和合并档案在异常路径也通过 finally 关闭。原先原生 `addFile` 直接抛错，跳过后面的 close，在 Windows 上留下文件锁。

## 验证

运行：`npx tsx scripts/test-campaign-w3n-merge.ts`，或 `npm run test:campaign-w3n`。

测试创建真实 W3N/W3X/W3M，使用已安装的 StormLib 原生模块。为模拟截图中作者工具生成的索引，读取源列表时附加内部条目；解包、写入、替换、索引生成和文件关闭均使用真实原生操作。

- 修复前复现同一 `.../slot_0/extract/(listfile)` 原生异常，并发现清理时 `EBUSY` 文件锁。
- 修复后两个地图合并成功，普通地图资源和地形字节保持，战役共享同名文件正确覆盖。
- 合并索引包含新增共享资源；输出没有嵌套的其他 `.w3x/.w3m`。
- 原始 W3N 字节未改动。
- 模拟普通文件原生写入失败，错误仍正常上报，文件句柄释放后输出可删除。
- 中文 W3N 文件名、中文游戏输出目录的临时目录转换与返回路径通过。
- 主进程生产构建通过，日志为 `_irys/work/campaign-w3n-main-build-20261015.log`。

未取得截图中玩家的原始战役，测试证明该报错路径已修复，不代表所有第三方战役的游戏运行兼容性都已验收。
