# Classic Mode Implementation - Complete

## ✅ 全部完成

### 后端实现
1. **经典模式切换** (`mod-management-handlers.ts`)
   - ✅ 文件夹移动逻辑（保留 `cos` 文件夹用于皮肤模型）
   - ✅ 创建 `units/unitskin.txt` from `unitskin-old.txt`
   - ✅ 状态持久化

2. **经典皮肤处理器** (`classic-skin-handlers.ts`)
   - ✅ 使用 INI 解析而非硬编码行号
   - ✅ 动态查找 `[HeroID]` section
   - ✅ 更新 `file`, `Art`, `unitSound`, `modelScale:hd` 字段
   - ✅ 自动添加缺失字段

3. **API 暴露**
   - ✅ `applyClassicSkin` - 应用经典皮肤
   - ✅ `getClassicSupportedHeroes` - 获取支持的英雄列表
   - ✅ Type definitions in `electron-api.d.ts`
   - ✅ Preload script exposure

### 前端实现
1. **Settings Modal** (`SettingsModal.tsx`)
   - ✅ 经典模式切换按钮
   - ✅ 条件禁用设置（graphics/game）
   - ✅ MOD toggle 限制
   - ✅ Delete Mod / Reset Rendering 限制

2. **Main Window** (`index.tsx`)
   - ✅ MOD toggle 在经典模式下被阻止

3. **Skin Modal** (`SkinModal.tsx`) - **NEW**
   - ✅ 检测经典模式
   - ✅ 隐藏 "战团/单位" 类别按钮
   - ✅ 只显示英雄皮肤
   - ✅ 使用 `applyClassicSkin` API
   - ✅ 转换 skin config 到经典格式
   - ✅ 阻止 custom/warband 皮肤应用

## 参数验证结果

对比 `_ref/old_client_code/skin` 与 `skin-config.ts`：

| 参数 | 旧代码 | 新配置 | 状态 |
|------|--------|--------|------|
| file | `units\human\Jaina\Jaina` | `units\\human\\Jaina\\Jaina` | ✅ 匹配 |
| Art | `ReplaceableTextures\CommandButtons\BTNJaina.blp` | `ReplaceableTextures\\CommandButtons\\BTNJaina.blp` | ✅ 匹配 |
| unitSound | `Jaina` | `Jaina` | ✅ 匹配 |
| modelScale:hd | `1.35` | `1.35` | ✅ 匹配 |

**所有参数使用正确！**

## 关键设计决策

1. **保留 `cos` 文件夹**
   - 原因：包含自定义皮肤模型（如 `cos\hum2\BloodElfKnight`）
   - 如果移走，皮肤会丢失模型文件

2. **使用 INI 解析**
   - 原因：`unitskin-old.txt` 格式可能变化
   - 动态查找 `[HeroID]` section 比硬编码行号更健壮
   - 自动处理缺失字段

3. **限制皮肤类型**
   - 经典模式：只允许英雄皮肤
   - 禁用：战团皮肤、自定义单位皮肤
   - 原因：符合"经典版"定义，减少复杂性

4. **参数转换**
   - `skin-config.ts` 的 `config` 数组转换为经典格式对象
   - 只提取 `file`, `Art`, `unitSound`, `modelScale:hd`
   - 忽略其他字段（如 `fileVerFlags`, `Art:hd` 等）

## 文件清单

### 新增文件
- `src/Main/ipc/classic-skin-handlers.ts` - 经典皮肤处理器

### 修改文件
- `src/Main/ipc/mod-management-handlers.ts` - 保留 cos 文件夹
- `src/Main/api/index.ts` - 注册 classic skin handlers
- `src/Main/preload.ts` - 暴露 classic skin APIs
- `src/types/electron-api.d.ts` - 类型定义
- `src/Renderer/components/MainWindow/SettingsModal.tsx` - 经典模式 UI
- `src/Renderer/components/MainWindow/index.tsx` - MOD toggle 限制
- `src/Renderer/components/MainWindow/SkinModal.tsx` - 皮肤类型限制
- `src/Renderer/hooks/useWar3Settings.ts` - classicMode 字段

### 删除文件
- `src/Renderer/assets/data/classic-skin-mapping.ts` - 不再需要（改用动态解析）

## 测试建议

1. **经典模式切换**
   - [ ] 开启经典模式
   - [ ] 验证文件夹移动到 QMoff（除 cos）
   - [ ] 验证 units/unitskin.txt 创建
   - [ ] 关闭经典模式
   - [ ] 验证文件夹恢复

2. **设置限制**
   - [ ] 经典模式下 graphics 设置禁用（除 envRender）
   - [ ] 经典模式下 game 设置禁用（除 UI）
   - [ ] MOD toggle 被阻止
   - [ ] Delete Mod / Reset Rendering 被阻止

3. **皮肤应用**
   - [ ] 打开 Skin Modal
   - [ ] 验证只显示"英雄"类别
   - [ ] 选择英雄皮肤并应用
   - [ ] 检查 units/unitskin.txt 是否正确修改
   - [ ] 验证游戏中皮肤生效

4. **状态持久化**
   - [ ] 开启经典模式
   - [ ] 重启应用
   - [ ] 验证经典模式状态保持

## 已知限制

1. **重复 modelScale:hd**
   - 吉安娜皮肤有两个 `modelScale:hd` 值（lines[5] 和 lines[60]）
   - 当前实现只会更新第一个找到的
   - 影响：可能导致某些缩放不正确

2. **皮肤兼容性**
   - 假设所有 `SKIN_CONFIG` 中的英雄皮肤都兼容经典模式
   - 未验证模型文件是否存在于 MPQ 或本地
   - 可能出现绿盒子（模型缺失）

3. **自定义模型路径**
   - 如果皮肤引用 `units\` 路径下的自定义模型
   - 且该模型在 MOD 的 units 文件夹中（已被移走）
   - 会导致模型丢失

## 后续优化建议

1. **处理多个 modelScale**
   - 解析时记录所有 `modelScale:hd` 行号
   - 允许指定更新第几个

2. **皮肤兼容性标记**
   - 在 `SKIN_CONFIG` 中添加 `classicCompatible: boolean`
   - 只显示标记为兼容的皮肤

3. **模型文件验证**
   - 应用皮肤前检查模型文件是否存在
   - 提示用户缺失的文件

4. **UI 改进**
   - 添加"经典模式"徽章/指示器
   - 显示当前支持的英雄数量
   - 提供经典模式说明文档
