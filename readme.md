# Quenching Client · 淬火客户端

面向 Warcraft III 的 **Electron 客户端**，用于淬火 MOD 的设置、资源管理、更新与游戏启动。

[下载稳定版 / Download](https://github.com/QuenchingCommunity/Quenching-Client/releases/latest) · [社区](https://qm.txzy.net/) · [使用手册](https://github.com/QuenchingCommunity/Quenching-Gitbook) · [反馈问题](https://github.com/QuenchingCommunity/Quenching-Client/issues/new/choose)

## 玩家入口 / For players

请在 Releases 中选择适合自己平台的便携包，解压后运行，并保留同目录的资源文件。具体系统与架构支持以该版本发布说明为准。

**客户端和完整 MOD 资源包需要分别下载。** 资源包见 [Quenching-Assets](https://github.com/QuenchingCommunity/Quenching-Assets/releases/latest)。首次安装先阅读[安装指南](https://github.com/QuenchingCommunity/Quenching-Gitbook/blob/Main/an-zhuang/chang-gui-an-zhuang.md)，Mac 用户另见 [Mac 安装](https://github.com/QuenchingCommunity/Quenching-Gitbook/blob/Main/an-zhuang/mac-an-zhuang.md)。

This is the Electron client for Quenching MOD. Get a portable build from Releases and download MOD resources separately. Platform and architecture support are described in each release.

## 开发入口 / For contributors

源码以 TypeScript、React 与 Electron 为主。依赖和实际构建命令见 [package.json](package.json)；已有依赖锁定文件为 `yarn.lock`。原有构建框架说明保留在下方。

提交前请运行与改动相关的检查，并在 PR 中注明测试平台。反馈请区分客户端、MOD 资源和游戏版本，附系统、Retail/PTR、SD/HD/DE 及复现步骤。详见[贡献指南](https://github.com/QuenchingCommunity/.github/blob/main/CONTRIBUTING.md)。

---

# 项目构建

* **webpage端口号优先级:**
1. 命令行参数
2. `projects/<project-name>`目录下的`partial.webpack-conf.ts`对象的`devServer.port`
3. `engine`内部备用的端口号

* 打包和构建:
  * webpack-start : 打包并在development启动devServer
  * webpack-build : 打包production产物,为electron-builder提供成果

* **目录结构:**
  * 构建工具链位于根目录下的engine,启动开发环境和打包都是从根目录运行命令,例如:
    ```shell
    npm start <project-name>
    #或者深层子项目:
    npm start <project-name/sub-project-name[.../sub-sub-project-name]>
    ```
    每级子目录都会去父级`projects`文件夹下寻找
    打包项目根目录需要有`package.json`并标明`main`字段,`engine`会根据此拿到入口文件
  * 打包后产物会放在该子工程的根目录下`dist`文件夹内,根目录有`main.js`和`index.html`,`electron`会在这里启动

