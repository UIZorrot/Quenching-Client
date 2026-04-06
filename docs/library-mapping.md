# WPF到JavaScript库映射分析

## 原WPF项目使用的第三方库

### UI相关库
1. **Extended.Wpf.Toolkit** (3.8.1)
   - 功能：扩展WPF控件库
   - JavaScript替代：Antd + React组件库
   - 映射：NumericUpDown → InputNumber, ColorPicker → ColorPicker等

2. **WpfAnimatedGif** (2.0.0)
   - 功能：WPF中播放GIF动画
   - JavaScript替代：原生HTML5 `<img>` 或 `gif.js`
   - 映射：直接使用HTML5 video/img标签

3. **Syncfusion.Xamarin.SfNumericUpDown** (18.1.0.57)
   - 功能：数字输入控件
   - JavaScript替代：Antd InputNumber
   - 映射：完全替代

### 文件处理库
4. **SharpZipLib** (1.3.1)
   - 功能：ZIP文件压缩解压
   - JavaScript替代：`jszip` + Node.js `archiver`/`yauzl`
   - 映射：需要在主进程中处理

5. **CascLib** (1.0.13)
   - 功能：暴雪游戏文件格式处理
   - JavaScript替代：需要寻找或移植C++库
   - 映射：可能需要通过子进程调用原生库

6. **MimeKitLite** (2.6.0)
   - 功能：MIME类型处理
   - JavaScript替代：`mime-types` npm包
   - 映射：直接替代

### 系统相关库
7. **System.Runtime.CompilerServices.Unsafe** (4.7.1)
   - 功能：.NET底层内存操作
   - JavaScript替代：Node.js Buffer API
   - 映射：通过Node.js原生API

## JavaScript/Node.js替代方案

### 推荐的npm包
```json
{
  "dependencies": {
    "jszip": "^3.10.1",           // 替代SharpZipLib
    "archiver": "^5.3.1",        // ZIP压缩
    "yauzl": "^2.10.0",          // ZIP解压
    "mime-types": "^2.1.35",     // 替代MimeKitLite
    "gif.js": "^0.2.0",          // GIF处理
    "node-7z": "^3.0.0",         // 7zip支持
    "fs-extra": "^11.1.1",       // 文件系统扩展
    "electron-store": "^8.1.0"   // 配置存储
  }
}
```

### UI组件映射
- WPF Button → Antd Button
- WPF TextBlock → HTML div/span + CSS
- WPF Grid → CSS Grid/Flexbox
- WPF MediaElement → HTML5 video
- WPF Image → HTML img
- WPF ProgressBar → Antd Progress
- WPF ComboBox → Antd Select
- WPF CheckBox → Antd Checkbox
- WPF Slider → Antd Slider

### 特殊功能处理
1. **多语言支持**：.que文件解析 → 自定义解析器
2. **文件下载**：WPF WebClient → Node.js fetch/axios
3. **注册表操作**：Windows Registry → `regedit` npm包
4. **进程管理**：.NET Process → Node.js `child_process`
5. **系统信息**：WMI → `systeminformation` npm包

## 实现策略
1. 优先使用现有的成熟npm包
2. 对于特殊格式（如CASC），考虑通过子进程调用原生工具
3. UI完全使用React+Antd重构
4. 文件操作在Electron主进程中处理
5. 保持原有的功能逻辑不变
