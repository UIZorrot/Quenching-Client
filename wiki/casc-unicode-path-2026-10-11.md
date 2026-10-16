# 涂装预览、反和谐 CASC 读取调查（2026-10-11）

## 玩家报告与限制

安装完整包 ZIP 后，涂装预览显示获取失败；游戏内能看到 MOD 标志；反和谐弹出三行英文错误。没有玩家的系统类型、游戏路径和完整报错，因此不能认定此玩家的具体根因。

MOD 标志来自本地 MOD 文件，并不能证明客户端成功打开暴雪的 CASC 数据。

## 已复现问题

只读输入：`D:\Quenching\War3Reforged\Warcraft III`（3.0.1.24342）。

同一游戏通过临时目录连接 `C:\Users\uizor\AppData\Local\Temp\quenching-casc-probe-TVUxkf\魔兽目录` 访问时：

- 普通英文根目录，以及根目录加 `*w3` 均可打开。
- `_retail_` 路径也可打开。
- 中文目录连接直接打开和加 `*w3` 都报 `Failed to open CASC storage`。
- 不是通过复制或修改游戏文件得到的差异；使用的是同一份 CASC。

读取验证的具体资源：

- `war3.w3mod:units\unitskin.txt`，967,096 字节。
- `war3.w3mod:_hd.w3mod:units\human\footman\footman.mdx`。
- `war3.w3mod:_de.w3mod:units\human\footman\footman.mdx`。

这证明 Windows 原生绑定存在非 ASCII 文件系统路径兼容问题，不证明所有资源文件或 CASC 格式解析都失效。

## 修复

共用入口 `src/Main/services/casc-storage.ts`：仅当 Windows 游戏路径包含非 ASCII 字符时，建立临时 ASCII 目录连接，将这个连接传给原生库；使用结束后关闭存储并删除连接。玩家配置和游戏资源位置不变，不复制 CASC 数据，也不修改游戏文件。

接入位置：

- `src/Main/services/model-resource-service.ts`：模型和贴图预览；并发请求共用一个 CASC 句柄。
- `src/Main/services/version-skin-service.ts`：原版皮肤基准。
- `src/Main/services/custom-skin-service.ts`：自定义涂装的原版纹理查询。
- `src/Main/services/anti-harmony-service.ts`：反和谐原版资源提取。
- `src/Main/ipc/anti-harmony-handlers.ts`：修正缺少安装路径时的乱码提示。

反和谐不再拼接一串问号掩盖原生错误；CASC 打不开时保留原始游戏完整路径和原始错误原因。

## 验证

```powershell
npx tsx scripts/test-casc-storage.ts "D:/Quenching/War3Reforged/Warcraft III"
npx tsx scripts/test-model-resource-layers.ts
npx tsx scripts/test-version-skin-service.ts
npx tsx scripts/test-anti-harmony-casc-path.ts
npx tsx scripts/test-custom-skin-textures.ts
```

真实 CASC 验证读取了皮肤配置和 HD／DE 模型，中文路径及中文分支路径修复后通过。反和谐写入、关闭停放测试只操作临时模拟目录，不对真实游戏执行反和谐提取。

本次修复尚未重新打包或发布。没有玩家原始错误，仍需用修复后的客户端或取得原始报错确认该玩家是否属于此问题。之前 Mac 包缺少 darwin 原生模块及签名的问题是另一项，不由 Windows 中文路径修复代替。
