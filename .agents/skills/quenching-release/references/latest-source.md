# Latest 唯一资源源目录（2026-10-12）

完整包／MOD 新版本的资源字节只读取 `D:/Quenching/QM/Latest`。历史清单描述旧版，正式 ZIP 可以为隔离测试／恢复提供旧文件，但都不是新版本内容的回退源。客户端自身 assets 与应用代码不在本次源目录调整范围内。

## 准备候选

私有工具仍在忽略 Git 的 `_irys/`。明确新的内部版本及递增序号，不用不同资源复用已发布版本。

```text
node --import tsx _irys/prepare-mod-latest.ts
  --from PREVIOUS-OFFICIAL.files.json.gz
  --version NEW-VERSION --sequence NEW-SEQUENCE
  --output _irys/releases/NEW-CANDIDATE
  --sync-latest-metadata
```

该入口直接扫描 Latest，生成小型官方快照、增改删报告、前版快照和 `_patch` 元数据，不复制资源树、不上传或部署。`--sync-latest-metadata` 备份并同步生成的版本标记及清单到 Latest，不改游戏资源。编辑中的 Latest 允许有未发布改动；标记记录最后发布／候选版本，并不证明工作内容仍与该版一致。不要将有未发布改动的工作目录当原正式版分发。

只检查而不选择新版本时：`--audit --from PREVIOUS-OFFICIAL.files.json.gz --output NEW-PRIVATE-AUDIT-DIR`。审计模式记录待发布差异，不改 Latest 或生成正式版本元数据。

## 使用同一源打包

自动版本 ZIP 使用 `_irys/build-mod-zip.ts`，`--root D:/Quenching/QM/Latest`，其余参数为前版／候选快照、前版签名链、不可变下载根和现有签名密钥。生产拒绝其他源目录；`--fixture` 只用于隔离发布器测试，不用于实际发布。

完整 A／B 和手动差异包：

```powershell
$env:QUENCHING_RELEASE_DIR = '_irys/releases/NEW-CANDIDATE'
node _irys/package-full-36.mjs
```

尽管文件名沿用旧版，这个打包器从 `preparation.json` 读取版本／序号，所有资源直接读取 Latest，生成的标记／清单读取本次候选元数据。拒绝 `QUENCHING_MOD_BASE_ROOT` 和非 Latest 的生产源覆盖。准备后 Latest 变化就重新准备候选，不从旧目录补齐被删除文件。校验生成 ZIP 的实际内容与本次清单一致，不额外解压整套测试副本。

## 保留与清理

保留正式快照／索引、需要兼容的版本 ZIP、当前已验证 A／B、凭据、真实旧客户端基线。发布／测试调用者迁移后，可以删除旧完整解压 `mod-root` 和已过期测试候选。

`_irys/read-published-mod-resources.mjs` 从保留的正式 3.6.1 A／B 中按需读取旧文件用于回归测试，不被生产打包器调用。旧的完整树生成／修改脚本 `prepare-36-input.mjs`、`freeze-latest-361.ts`、`prepare-mod-362.ts`、`include-t20-resource-revision.mjs`、`build-36-manual-mod-overlay.mjs` 已归档并在运行前报错退出。旧发布证据中的资源路径是历史记录，不是活跃配置。

验证入口：`node _irys/test-mod-latest-source.mjs` 和现有 MOD ZIP 回归。清理前后，用真正的 Latest 审计证明资源没变、主动删除没恢复。本轮工具整理不授权新发布或线上清单切换。
