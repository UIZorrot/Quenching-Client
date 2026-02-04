
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

