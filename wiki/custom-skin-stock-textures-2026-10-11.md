# Hive 自定义皮肤：游戏自带贴图自动关联

## 已确认的 EnvironmentMap 问题

只读检查 `D:\Quenching\War3Reforged\Warcraft III`（3.0.1.24342）中的 CASC：

- `war3.w3mod:_hd.w3mod:replaceabletextures\environmentmap.dds` 存在。
- `war3.w3mod:_de.w3mod:replaceabletextures\environmentmap.dds` 存在。
- 根路径 `EnvironmentMap.blp` 和 `Textures\EnvironmentMap.blp` 的候选 BLP／DDS 文件不存在。

因此，这个名称的漏关联既可能受 Windows 中文游戏路径影响，也可能独立发生在英文游戏路径：旧模型引用省略了目录或使用旧目录名称，而当前游戏包保存为 ReplaceableTextures 下的 DDS。

## 修复范围

`src/Main/services/model-resource-service.ts` 的资源候选补充：

- 没有目录的贴图名称额外尝试 `Textures`、`ReplaceableTextures`。
- `EnvironmentMap.blp`、`Textures\EnvironmentMap.blp`、`war3mapImported\EnvironmentMap.blp` 兼容 `ReplaceableTextures\EnvironmentMap.dds`；DDS／TIF 名称也应用相同路径规则。
- 保留原路径优先；不全量扫描 CASC，不跨 SD／HD／DE 混用模型或专属贴图。

自定义皮肤界面已有“魔兽自带 · 已关联”状态。识别成功的资源无需玩家选择本地文件。保存时 `custom-skin-service.ts` 将导入副本的 TEXS／Bitmap 引用改为匹配的实际路径，例如 `ReplaceableTextures\EnvironmentMap.dds`；不修改 Hive 下载的原模型，不把暴雪自带贴图另行导出到玩家目录。

模型包实际包含同名自定义贴图时继续优先使用该文件。无法确认的贴图仍需要模型包中的对应图片；不根据随意重名猜测资源。

## 使用步骤（需要含本次修复的新客户端）

1. 将 Hive 模型包完整解压，保留配套贴图和头像模型。
2. 在涂装的自定义皮肤中选目标单位和对应画质，选择外部模型导入。
3. 选择 MDX／MDL 主模型及 BTN、禁用 BTN 图标。
4. 模型包贴图自动匹配；游戏自带贴图显示“魔兽自带 · 已关联”，不需要手动查找。
5. 只为仍缺失、且确实属于模型包的图片手动关联，保存后应用涂装。

本机 3.0.1 的 EnvironmentMap 仅在 HD／DE 层找到，因此该验证不承诺 SD 能使用这个 HD／DE 专属资源。

## 验证

- `scripts/test-custom-skin-native-search.ts`：真实 CASC 的 SD Footman 2 个、HD 23 个、DE 9 个依赖自动关联；HD／DE 的三种 EnvironmentMap 引用都关联成功并读到正确 DDS 字节。
- `scripts/test-custom-skin-textures.ts`：导入副本引用正确、无需导出游戏自带图片、原模型不变、自定义同名图片优先、SD／HD／DE 资源不混用。

代码已修复，尚未重新打包发布；旧客户端仍可能要求玩家关联本来不在 Hive 包中的资源。
