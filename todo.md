可以

对于设置部分，我们增加两个tab，一个是basic，里面应该只有一些按钮，除了现有的功能外，还需要

具体来说这两个部分影响的都是shaders

使用旧版魔兽 → 【已改为自动】
根据检测到的魔兽版本自动选择：
- < v2.0.0 → assets\quenching\shaders1.xx.zip（来自 1.8/shaders/ps.zip）
- v2.0.0–v2.0.2 → assets\quenching\shaders2.02.zip
- ≥ v2.0.3 → assets\quenching\shaders2.03.zip
（不再使用 zip-shaders.zip，也不再提供手动开关）

使用Intel/AMD显卡
如果你使用的是集成显卡或者非Nividia显卡，请打开这个按钮

解压
assets\quenching\bloomextract.bls
到 <魔兽目录/_retail_/shaders/ps/bloomextract.bls>


另外一个是战役（英文 Campaign），功能主要是

1. 启动一个地图，附带难度

2. 将一个w3n解包成文件夹，然后选择里面的地图启动

这个功能可能需要引入一些能够控制mpq的库，尽量选择用的人最多的，知名度最高，最可靠的包
