# DE 地形改造：具体路径与验证记录（2026-10-08）

## 验证范围

- CASC：`D:\Quenching\War3Reforged\Warcraft III`，3.0.1.24342，只读。
- 完整资源维护树：`D:\Quenching\QM\Latest`。没有覆盖玩家当前游戏目录。
- 下列“缺图”均指维护树中现有 diffuse 缺少配套 normal／orm。DDS 和 TIF 都检查了。
- 表数据和真实文件验证、HD／DE 切换回归、原版树木回归已通过；没有进行游戏内逐地图视觉验收。

## 本地确实缺失并补齐的 26 张贴图

全部从 DE CASC 读取，并逐文件比对提取结果与 CASC 字节一致。没有新增 diffuse。

| 补入的完整路径 | CASC 来源 |
| --- | --- |
| `D:\Quenching\QM\Latest\t30\ashenvale\ashen_cliff0_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_cliff0_normal.dds` |
| `D:\Quenching\QM\Latest\t30\ashenvale\ashen_cliff0_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_cliff0_orm.dds` |
| `D:\Quenching\QM\Latest\t30\ashenvale\ashen_cliff1_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_cliff1_normal.dds` |
| `D:\Quenching\QM\Latest\t30\ashenvale\ashen_cliff1_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_cliff1_orm.dds` |
| `D:\Quenching\QM\Latest\t30\ashenvale\ashen_leaves_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_leaves_normal.dds` |
| `D:\Quenching\QM\Latest\t30\ashenvale\ashen_vines_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_vines_normal.dds` |
| `D:\Quenching\QM\Latest\t30\cityscape\city_cliff1_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\cityscape\city_cliff1_normal.dds` |
| `D:\Quenching\QM\Latest\t30\cityscape\city_cliff1_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\cityscape\city_cliff1_orm.dds` |
| `D:\Quenching\QM\Latest\t30\cityscape\city_squaretiles_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\cityscape\city_squaretiles_normal.dds` |
| `D:\Quenching\QM\Latest\t30\cityscape\city_squaretiles_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\cityscape\city_squaretiles_orm.dds` |
| `D:\Quenching\QM\Latest\t30\felwood\新建文件夹\ashen_cliff0_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_cliff0_normal.dds` |
| `D:\Quenching\QM\Latest\t30\felwood\新建文件夹\ashen_cliff0_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_cliff0_orm.dds` |
| `D:\Quenching\QM\Latest\t30\felwood\新建文件夹\ashen_cliff1_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_cliff1_normal.dds` |
| `D:\Quenching\QM\Latest\t30\felwood\新建文件夹\ashen_cliff1_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_cliff1_orm.dds` |
| `D:\Quenching\QM\Latest\t30\felwood\新建文件夹\ashen_leaves_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_leaves_normal.dds` |
| `D:\Quenching\QM\Latest\t30\felwood\新建文件夹\ashen_vines_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\ashenvale\ashen_vines_normal.dds` |
| `D:\Quenching\QM\Latest\t30\lordaeronfall\lordf_dirt_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\lordaeronfall\lordf_dirt_orm.dds` |
| `D:\Quenching\QM\Latest\t30\lordaeronfall\lordf_rock_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\lordaeronfall\lordf_rock_orm.dds` |
| `D:\Quenching\QM\Latest\t30\lordaeronfall\lords_cliff0_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\lordaeronsummer\lords_cliff0_normal.dds` |
| `D:\Quenching\QM\Latest\t30\lordaeronfall\lords_cliff0_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\lordaeronsummer\lords_cliff0_orm.dds` |
| `D:\Quenching\QM\Latest\t30\lordaeronfall\lords_cliff1_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\lordaeronsummer\lords_cliff1_normal.dds` |
| `D:\Quenching\QM\Latest\t30\lordaeronfall\lords_cliff1_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\lordaeronsummer\lords_cliff1_orm.dds` |
| `D:\Quenching\QM\Latest\t30\lordaeronwinter\lordw_snowgrass_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\lordaeronwinter\lordw_snowgrass_orm.dds` |
| `D:\Quenching\QM\Latest\replaceabletextures\cliff\c00\cliffb\cliff0_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\barrens\barrens_cliff0_orm.dds` |
| `D:\Quenching\QM\Latest\replaceabletextures\cliff\c00\cliffv\cliff0_orm.dds` | `war3.w3mod:_de.w3mod:terrainart\village\village_cliff0_orm.dds` |
| `D:\Quenching\QM\Latest\t20\village\village_rocks_normal.dds` | `war3.w3mod:_de.w3mod:terrainart\village\village_rocks_normal.dds` |

## SLK 中没有对应本地 diffuse 的旧路径

下列行原先指向 `ReplaceableTextures\Cliff\Cliff0` 或 `Cliff1`，本地没有同名 diffuse。按新的规则，恢复为每个地形在原版 SLK 中的专属悬崖路径；不补 diffuse。
这类修改是“恢复原版归属”，不等于已经证实旧版每种地形都显示错误。

| SLK 完整路径 | 行 ID | 原 texDir / texFile | 当前 texDir / texFile |
| --- | --- | --- | --- |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes00.slk` | `CDdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Dungeon\Cave_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes00.slk` | `CDsq` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Dungeon\Cave_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes00.slk` | `CGdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Dungeon2\GCliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes00.slk` | `CGsq` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Dungeon2\GCliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes00.slk` | `COdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Outland\Outland_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes00.slk` | `COrd` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Outland\Outland_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes00.slk` | `CKdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\BlackCitadel\Citadel_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes00.slk` | `CKdt` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\BlackCitadel\Citadel_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CFdi` | `ReplaceableTextures\cliff\Cliff0` | `TerrainArt\LordaeronFall\Lordf_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CFgr` | `ReplaceableTextures\cliff\Cliff1` | `TerrainArt\LordaeronFall\Lordf_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CAgr` | `ReplaceableTextures\cliff\Cliff1` | `TerrainArt\Ashenvale\Ashen_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CAdi` | `ReplaceableTextures\cliff\Cliff0` | `TerrainArt\Ashenvale\Ashen_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CXdi` | `ReplaceableTextures\cliff\Cliff0` | `TerrainArt\Dalaran\Dalaran_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CXsq` | `ReplaceableTextures\cliff\Cliff1` | `TerrainArt\Dalaran\Dalaran_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CDdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Dungeon\Cave_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CDsq` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Dungeon\Cave_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CGdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Dungeon2\GCliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CGsq` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Dungeon2\GCliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CZdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Ruins\Ruins_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CZlb` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Ruins\Ruins_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CIsn` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Icecrown\Ice_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CIrb` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Icecrown\Ice_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `COdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Outland\Outland_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `COrd` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Outland\Outland_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CKdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\BlackCitadel\Citadel_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CKdt` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\BlackCitadel\Citadel_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CJdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\DalaranRuins\DRuins_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes16.slk` | `CJsq` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\DalaranRuins\DRuins_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CAgr` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Ashenvale\Ashen_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CAdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Ashenvale\Ashen_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CXdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Dalaran\Dalaran_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CXsq` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Dalaran\Dalaran_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CDdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Dungeon\Cave_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CDsq` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Dungeon\Cave_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CGdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Dungeon2\GCliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CGsq` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Dungeon2\GCliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CZdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Ruins\Ruins_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CZlb` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Ruins\Ruins_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CIsn` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Icecrown\Ice_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CIrb` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Icecrown\Ice_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `COdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\Outland\Outland_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `COrd` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\Outland\Outland_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CKdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\BlackCitadel\Citadel_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CKdt` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\BlackCitadel\Citadel_Cliff1` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CJdi` | `ReplaceableTextures\Cliff\Cliff0` | `TerrainArt\DalaranRuins\DRuins_Cliff0` |
| `D:\Quenching\QM\MOD\QuenChing-Electron-Client\assets\quenching\tile\clifftypes18.slk` | `CJsq` | `ReplaceableTextures\Cliff\Cliff1` | `TerrainArt\DalaranRuins\DRuins_Cliff1` |

### 通用悬崖路径的 CASC 核对

本次 CASC 中未找到这些通用路径的 DDS；不据此推断所有游戏版本的结果。


## T30 名称与非覆盖项

- `D:\Quenching\QM\Latest\t30\lordaeronfall\lords_cliff0_diffuse.dds`、`lords_cliff1_diffuse.dds` 是已有定制贴图；原版 SLK 的秋季名字却是 `Lordf_Cliff0/1`。新 `clifftypes30.slk` 的 `CFdi`／`CFgr` 指向现有 `lords_cliff0/1`，未替换 diffuse。
- `D:\Quenching\QM\Latest\t30\lordaeronwinter\lords_dirt_orm.dds` 没有 diffuse；没有为它补 diffuse／normal，也没有纳入 SLK 替换。
- `D:\Quenching\QM\Latest\t30\felwood\新建文件夹` 是已有的 Ashenvale 纹理副本。其有 diffuse 的贴图补齐了 6 张 normal／orm，但这个嵌套目录不写进 SLK。
- T30 只覆盖 72 条地形、16 条悬崖，其余 152 条地形、29 条悬崖保留原版完整内容。五套表都保留 224 条地形和 45 条悬崖。

## 可复现检查

```powershell
node scripts/test-decisive-terrain-assets.mjs "D:/Quenching/War3Reforged/Warcraft III" "D:/Quenching/QM/Latest"
node scripts/test-terrain-slk-alignment.mjs "D:/Quenching/War3Reforged/Warcraft III" "D:/Quenching/QM/Latest" "_backup/terrain-slk-alignment-uiA8nk"
npx tsx scripts/test-terrain-profile-water.ts
npx tsx scripts/test-graphics-settings-transition.ts
```

本地维护内容尚未重新打包或发布，旧 3.5 官方清单没有改写。
