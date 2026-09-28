# Warcraft III / W3Champions 研究工具

这些工具用于本机游戏接口研究。原理、已验证范围和一次运行时崩溃记录见 `docs/research/W3CHAMPIONS_TECHNICAL_RESEARCH_2026-09-15.md`。

2026-09-16 新增两种 GUID 发现实验，见 `docs/research/WAR3_GUID_DISCOVERY_2026-09-16.md`。

## 依赖与文件位置

- Windows x64、Python 3。
- 本仓库的 Node 环境：`typescript` 和 `ws` 可被 require。
- CASC 提取需要单独提供 **ANSI x64 CascLib 3.x native DLL**。不要传入 .NET 包装 DLL、x86 DLL 或 Unicode 构建。
- 输出建议放到仓库已有 gitignore 规则覆盖的 `analysis_outputs/`。
- 原始游戏资源与第三方源码快照只供本地研究，不进入客户端发布包。

## 1. 只读 CASC 提取

```powershell
$cascDll = Join-Path $env:TEMP 'quenching-w3c-research-20260915\CascLib\build-qc\libCascLib.dll'
python scripts/research/extract-war3-webui.py --game 'D:\Quenching\War3Reforged\Warcraft III' --dll $cascDll --out analysis_outputs/w3champions-20260915/casc-webui
```

脚本枚举 WebUI 名称，只提取 JS/HTML/JSON 文件。每文件上限 32 MiB，拒绝输出到游戏目录中，校验导出路径并记录 SHA-256。不会写入 CASC。

当前版本需要带 `war3.w3mod:` 的虚拟路径。两个裸路径探测失败会记录在 manifest 中，不代表其他提取失败。清单计数按忽略大小写的文件名去重。

### 本次 DLL 的构建记录

源码：[CascLib commit 2a280f5a231966dc5d1b534978dd9f9f04a374cd](https://github.com/ladislav-zezula/CascLib/tree/2a280f5a231966dc5d1b534978dd9f9f04a374cd)。本机使用 `C:/MinGW/bin` 下的 CMake/Ninja/Clang 兼容驱动。

在该源码工作副本的 CMakeLists.txt 末尾添加一次：

```cmake
target_link_libraries(casc ws2_32)
```

然后在该源码目录运行：

```powershell
cmake -S . -B build-qc -G Ninja -DCMAKE_C_COMPILER=C:/MinGW/bin/gcc.exe -DCMAKE_CXX_COMPILER=C:/MinGW/bin/g++.exe -DCMAKE_BUILD_TYPE=Release -DCASC_BUILD_SHARED_LIB=ON -DCMAKE_DISABLE_FIND_PACKAGE_ZLIB=TRUE
cmake --build build-qc --parallel 4
```

本机输出为 `build-qc/libCascLib.dll`。其他工具链的文件名/依赖可能不同；脚本会加载 DLL 所在目录，并在存在时加入 `C:/MinGW/bin` 作为 DLL 搜索目录。

## 2. 静态 API 清单

```powershell
node scripts/research/inventory-war3-webui.cjs analysis_outputs/w3champions-20260915/casc-webui/war3.w3mod/webui/GlueManager.js analysis_outputs/w3champions-20260915/api-inventory.json assets/quenching/gluemanager.js
```

用 TypeScript AST 解析 JS，不执行输入。输出包含字面量 sendMessage/addListener 名称、调用点、参数表达式、对象字段和动态调用点。

`offset` 为 UTF-16 字符串索引，不是文件字节偏移。清单是候选接口，不是所有 native handler；调用参数也不是完整 schema。省略参数时，游戏自身 GameClient 会补 `{}`。

## 3. 临时运行时诊断

**已知结果：首次版本同时查询 GetFeatureFlags 与 GetGameInfo，随后游戏出现崩溃。当前版本只查询 GetFeatureFlags，尚未再次实机验证稳定性。GetGameInfo 不适合作为菜单健康检查。**

诊断工具会临时编辑一个已有 `index.html`，在 GlueManager 加载前插入脚本，观察游戏自行创建的 WebSocket。随后建立额外连接，发送一次 GetFeatureFlags。它不建房、不进入匹配、不发聊天。

### 操作步骤

1. 关闭准备研究的 Warcraft III 实例，避免加载时机不确定。
2. 暂停任何会同步该 WebUI index 的客户端操作。
3. 在仓库根目录启动下列命令。每次使用新的输出名称；备份已存在时脚本会拒绝覆盖。

```powershell
node scripts/research/capture-war3-bridge.cjs 'D:\Quenching\War3Reforged\Warcraft III\_retail_\webui\index.html' analysis_outputs/w3champions-20260915/runtime-next.json
```

4. 等待 `Capture ready`，在 90 秒内直接启动游戏。不要通过会覆盖 index 的 Quenching 启动前同步流程。
5. 捕获地址后采集 12 秒；无地址时最多 90 秒，然后恢复 index。Ctrl+C 也会尝试恢复。
6. 检查输出中的 `restored` 和文件摘要，检查游戏及新的 Crash.txt。

服务器只监听 127.0.0.1，使用随机会话路径，只接受 loopback HTTP Origin。报告只写消息名、字段名、隐藏 GUID 的 endpoint；不持久化真实 GUID 和账户/聊天 payload。随机路径不是部署到公网的认证方案。

### 恢复机制与异常退出

启动时保存 `OUTPUT_JSON.index-backup`；退出时只有当前 index 仍与本次插入版本一致才自动恢复，避免覆盖其他程序刚写入的内容。

如果 Node 被强制结束或系统掉电，无法保证运行清理逻辑。保留备份，先确认目标仍有 `quenching-research-capture` 标记、期间没有其他编辑，再恢复到明确的目标文件。不要直接覆盖其他客户端已更新的入口。

例如，对本次首次诊断原始备份进行只读比较：

```powershell
Get-FileHash 'D:\Quenching\War3Reforged\Warcraft III\_retail_\webui\index.html'
Get-FileHash analysis_outputs/w3champions-20260915/runtime-capture.json.index-backup
```

诊断脚本不是正式 addon。正式实现需要版本检查、会话状态机、原 UI 与额外连接的兼容验证，以及业务命令白名单。

## 本次验证范围

- CASC 提取实际成功，导出 3 个文件。
- AST 清单实际生成：209 个静态消息、126 个静态事件、4 个动态调用点。
- Node 外部连接实际收到 FeatureFlags。
- 临时 index 已恢复，哈希一致。
- 两个 Node 脚本通过 `node --check`；Python 通过 AST 语法解析。
- 没有把研究脚本接入 Quenching 产品界面，也没有执行完整联机或匹配验收。

## 4. 直接从页面 URL 回传 GUID（09-16 新增）

默认仅被动观察。关闭对应测试实例后运行，看到 ready 后再启动游戏；使用新的输出文件名。

```powershell
node scripts/research/capture-war3-guid.cjs 'D:\Quenching\War3Reforged\Warcraft III\_retail_\webui\index.html' analysis_outputs/w3champions-20260916/guid-next.json
```

脚本在 GlueManager 前读取 `location.search`，在外部 receiver 中保存端口和 GUID 摘要；同时观察原 socket 的事件名与认证布尔值。不会修改 WebSocket 构造器、send 或 onmessage。默认不建立额外游戏连接。

收到地址后观察 30 秒，无地址最多等待 90 秒；Ctrl+C 和正常结束会尝试恢复。异常强制结束时使用对应 `.index-backup` 恢复，先核对是否有其他程序修改过入口。地址回传失败有最多 60 秒的有限重试。

可选 `--probe` 在回传 8 秒后建立额外连接并发送一次 GetFeatureFlags。09-16 的两次 index 实验未使用该选项；主动查询是通过下一节的内存发现方式完成的。

## 5. 不修改 index，读取浏览器中已有的页面地址

先用游戏 PID 查找其直接子进程 `BlizzardBrowser.exe`，优先选择命令行 `--uid=1` 的主菜单浏览器。PID 必须来自本次正在研究的游戏，不要复用文档中的历史 PID。

```powershell
python scripts/research/discover-war3-url-memory.py --pid <当前游戏浏览器PID> --out analysis_outputs/w3champions-20260916/memory-next.json
```

`--probe` 可选：找到候选后通过 Node 进行 WebSocket 握手，并发送一次 GetFeatureFlags。

```powershell
python scripts/research/discover-war3-url-memory.py --pid <当前游戏浏览器PID> --out analysis_outputs/w3champions-20260916/memory-probe-next.json --probe
```

进程权限只有查询和读内存，默认读取预算 256 MiB、扫描 25 秒、最多 8 个候选；不保存内存转储。真实 URL 仅在进程内使用，主动验证时通过 stdin 传给 Node。脚本验证目标文件名必须为 BlizzardBrowser.exe；游戏父子关系需要调用者先核实。

输出中 `readOnly` 指进程内存访问方式；使用 `--probe` 时另有一次网络查询。GUID 保存为 SHA-256，避免把实际会话地址写入报告。

当前版本已验证两种方式发现的是同一个 GUID，且在不增加 index 脚本的全新启动中完成过一次外部查询。09-16 已加入实验性客户端诊断入口，使用独立 Windows 辅助脚本处理进程身份、端口归属、权限失败、握手验证和断开清理；游戏版本变化仍需实测。

## 6. 使用客户端同款模块验证

先启动魔兽，再执行：

```powershell
npm --prefix experiments/war3-lab run probe -- 'D:\Quenching\War3Reforged\Warcraft III'
```

脚本只观察现有 index 的哈希，不写入 index；使用生产 `War3Session` 自动发现和查询，随后断开。界面入口、实现说明和验证记录见 `docs/research/WAR3_NO_INDEX_CLIENT_INTEGRATION_2026-09-16.md`。
