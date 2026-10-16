# orcx03a：HD 淬火地形读档黑地面调查

日期：2026-10-11。状态：完成原版地图与本地资源静态调查，尚未复现玩家的黑地面，未确认根因、未发布修复。

## 玩家条件与调查边界

- 地图 `orcx03a`，HD，淬火地形；直接进入正常，读取存档后地面黑。
- 另一个现象：编辑器打开原版地图，不改内容、另存后，通过客户端启动时反和谐失效。
- 没有玩家的故障存档、另存地图、具体游戏版本和光照档位。两个现象暂不能认定为同一个原因。
- 本次只写入项目调查目录，没有调整实际游戏设置或覆盖游戏资源。

## CASC 提取结果

读取游戏根目录 `D:/Quenching/War3Reforged/Warcraft III`，选择 `*w3`。本地 `.build.info` 的 Retail 为 `3.0.0.24268`，PTR 为 `3.0.1.24332`；此次提取是 Retail，不能视为其他版本的实机验证。

| CASC 文件 | 提取目录 | 大小 |
| --- | --- | --- |
| `war3.w3mod:campaign\classic\tft\orcx03a.w3x` | `_irys/work/orcx03a-investigation/map-60/` | 277323 字节 |
| `war3.w3mod:campaign\reforged\tft\orcx03a.w3x` | `_irys/work/orcx03a-investigation/map-61/` | 286068 字节 |

两张地图各有 46 个 MPQ 条目。`war3map.w3e` 均为格式 12、100181 字节、97×129 个地形顶点，主地形 Cityscape，使用自定义地形组合。

两张地图的地形内容并不相同，SHA-256：

- Classic：`0bf537776cf5e75af4ca113f95de2a513d112d3b094d1556abd83d407528a137`
- Reforged：`3740cbc576b623ba31a87a88ffd4e484b718c7c2b93c3cb077ab7074dee2a45a`

地形格式 12 每个顶点占 8 字节，地形索引是 16 位字段中的低 6 位。调查脚本按新格式读取；旧版 `mdx-m3-viewer` 的 7 字节解析会产生假的越界索引，不能据此判定地图损坏。[格式作者的说明](https://github.com/ChiefOfGxBxL/WC3MapSpecification/blob/master/Terrain/12.md)

## 地形文件核对

地图地形列表为 `Ydrt,Ydtr,Ybtl,Ysqd,Yrtl,Zsan,Lrok,Ygsb`，悬崖列表为 `CYdi,CYsq`。当前 `terrain00/16/18/20/30.slk` 和对应 `clifftypes` 都有这些条目。

当前“淬火地形”的 T20 映射，在 `D:/Quenching/QM/Latest` 核对如下：

| ID | 纹理基路径（相对完整包根目录） |
| --- | --- |
| Ydrt | `t20/cityscape/City_Dirt` |
| Ydtr | `t20/cityscape/City_DirtRough` |
| Ybtl | `t20/cityscape/City_BrickTiles` |
| Ysqd | `t20/cityscape/City_SquareTiles` |
| Yrtl | `t20/cityscape/City_RoundTiles` |
| Zsan | `t20/ruins/Ruins_Sand` |
| Lrok | `t20/lordaeronsummer/Lords_Rock` |
| Ygsb | `t20/cityscape/City_Grass` |
| CYdi | `replaceabletextures/cliff/c20/CliffY/Cliff0` |
| CYsq | `replaceabletextures/cliff/c20/CliffY/Cliff1` |

以上 10 组都有 `_diffuse`、`_normal`、`_orm`，格式 DDS 或 TIF，共 30 个非空文件。其余档位的地图所需路径也能从完整包或 HD CASC 找到。

这证明当前维护资源里未发现这些路径缺文件，不证明玩家完整包内容相同，也不证明游戏读档时正确恢复纹理绑定或正确解码了这些文件。

## 地图脚本与光照

重制版 `map-61/war3map.j`：

- 第 5955 行：`SetDayNightModels` 使用 `Environment/DNC/DNCLordaeron/DNCLordaeronTerrain/DNCLordaeronTerrain.mdl` 与对应 Unit 模型。
- 第 3975 行：开场设置地形雾；第 4185 行：开场结束恢复地形雾。
- 第 4899、4939、4979 行：调用 `SaveGameCheckPointBJ("A Blaze of Glory", false)`。
- 未发现 `EVENT_GAME_LOADED` 读档事件处理或主动重新初始化地形纹理的逻辑。
- MPQ 未发现内置 `terrainart/terrain.slk`、着色器、DNC 模型或同路径的地形贴图。

当前客户端在进程启动前同步资源，通过 `-loadfile` 启动地图；它没有接管游戏内部的存档读取。新开地图的初始化和读档的状态恢复属于不同过程，不能通过“启动前再同步一次”就认定修复了读档问题。

## 网上资料的实际支持范围

1. [暴雪官方 2.0.3 更新说明](https://us.forums.blizzard.com/en/warcraft3/t/warcraft-iii-reforged-patch-notes-version-204/36567)明确列出读档后单位不可见、触发器保存异常的修复，并说明旧存档可能仍受影响。该帖更新后标题为 2.0.4，里面保留了 2.0.3 的完整说明。这证明魔兽曾存在读档恢复问题，不证明本次黑地面就是同一个已知问题。
2. [玩家在暴雪论坛报告杜隆塔尔战役读档后模型消失](https://us.forums.blizzard.com/en/warcraft3/t/invisible-models-when-loading-campaign-maps/35023)。现象接近但对象不同，属于玩家报告。
3. [地图作者报告读档后光照异常](https://us.forums.blizzard.com/en/warcraft3/t/lighting-gets-messed-after-loading-game/27764)，其症状为过亮，不是本次地面全黑，不能直接套用帖子中的推测。
4. [淬火旧说明书](https://ui-zorrot.gitbook.io/mod/chang-jian-wen-ti/you-xi-cuo-wu)建议先进入地图再读档。这是可试验的既有办法，尚未在本次故障上验证。

没有找到已确认根因、与“orcx03a + HD + 淬火地形 + 仅读档地面黑”完全一致的网上案例。兽族战役无法跳转下一关、跨版本存档无法加载、小地图地形开关等帖子不等同于本次现象。

## 编辑器另存与反和谐

原版地图包含 `war3mapSkin.w3u/.w3b/.w3d/.w3t/.w3a/.w3q`。调查脚本按格式 3 的修改集合读取，全部读取到文件末尾，没有解析错误。

`war3mapSkin.w3u` 为 6246 字节，60 个原版对象、35 个自定义对象。其中有 `umdl` 模型路径修改，例如 `n00C` 指向 `units/creeps/MurlocWarrior/MurlocWarrior_V1.mdl`。这些只是确认地图可以独立指定模型；原版修改集合标记均为 0，未查到路径中直接带 `_teen.w3mod` 的记录。

地图 `war3mapSkin.txt` 只有 74 字节，内容是食物不足提示/声音，不是地形配置或反和谐配置。

[HiveWE 作者说明](https://github.com/stijnherfst/HiveWE/wiki/war3map(skin).w3*-Modifications)记录了新皮肤修改表和集合格式；集合与不同资源模式的关联仍有未确认部分，不能擅自解释每个集合标记。

客户端反和谐只将非 teen 的 HD 文件写入选定游戏分支 `units/buildings/doodads`；不修改地图的皮肤表和导入资源。此外，已有目标文件会被跳过。这是代码可确认的覆盖范围限制，但没有玩家另存后的地图，尚不能确认另存到底改变了模型路径、资源模式还是启动环境。

另外，`launchMap` 固定带 `-testmapprofile WorldEdit`。它是另存地图启动时应核对的条件，不是已证明的反和谐故障原因。

## 最小复现对照

保持同一个魔兽版本与 HD；每次修改客户端资源后完整退出并重新启动魔兽。每组都使用新开地图、新建独立存档，再分别测试同进程 F10 读档和重启魔兽后读档。

| 对照 | 地形 | 着色器/后处理 | 目的 |
| --- | --- | --- | --- |
| A | 淬火 | 当前选择 | 建立可重复的基准 |
| B | 淬火 | 关闭物体着色器、后处理阴影与辉光 | 若恢复正常，优先查着色器或后处理恢复 |
| C | 原版 | 恢复 A 的选择 | 若仅此恢复正常，优先查自定义地形映射的读档恢复 |

关闭“物体着色器”实际也会移除 `shaders/ps/terrain.bls` 与 `vs/terrain.bls`，不是只影响单位。B 仍保留淬火 DNC，因此 B 失败不能排除 DNC；必要时再单独隔离 DNC。不能把 B 叫作完全原版渲染。

另存反和谐的问题则需要对比原版与编辑器另存的 MPQ：优先比较 `war3mapSkin.*`、`war3map.w3i`、`war3map.imp`、`_hd.w3mod/_teen.w3mod` 导入路径，并对比普通自定义游戏入口与客户端入口。

本轮产物：`_irys/work/inspect-orcx03a-casc.mjs`、`_irys/work/analyze-orcx03a.mjs`、`_irys/work/orcx03a-investigation/map-report.json`、`analysis.json` 及原版地图提取文件。没有为未确认的原因增加客户端检查、地图补丁或重复同步。
