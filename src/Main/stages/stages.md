Electron应用生命周期 

在不同的阶段做不同的事情, 确保各个服务按照预期顺序执行

比如:IpcMain.on和handle需要在初始化BrowserWindow之前全部注册完毕. 否则可能错过事件
