# 自动更新低速切源

本次只调整传输层，MOD 补丁和客户端补丁的签名格式、安装流程均不改变。不继续推进新的逐文件发布方案，也不把已有在线差分文件改成 ZIP；整包自动更新另行处理。

## 规则

- 使用签名清单原有的源顺序；遇到本项目 GitHub Release 资产，在它之后依次插入 `gh-proxy.com`、`ghproxy.net`，地址均为 `https://镜像域名/<完整GitHubReleaseURL>`。GitLawb 与 R2 不经过这些镜像，R2 仍按清单作为最后备用。`gh-proxy.org` 在较大文件测试中超时，按用户要求已从候选移除。
- 从请求开始按 15 秒窗口观察，不额外预热 10 秒。平均低于 128 KiB/s，且剩余超过 32 KiB、预计还需超过 10 秒时，终止当前连接并尝试下一个源。完全没有进展也触发切源。
- 最后一个源不因速度低而中止，以免玩家网络本身很慢时所有源均被放弃；连接故障／30 秒无活动／哈希或大小错误仍报错。
- 切源重下当前下载文件／分片，不做跨源断点续传，不拼接未校验的字节。已完成分片只在当前同一源内拼接；整产物失败后清理暂存，换源重试。
- 镜像产物通过原签名清单的大小和 SHA-256 校验后，本次客户端运行期间后续 GitHub 下载优先尝试成功的那个镜像；失败后仍尝试直连和其他镜像，不重复插入同一镜像；重启恢复原有顺序。
- 暂不增加外部 IP 定位请求，不根据系统语言／时区猜国内网络。用实际传输速度和校验成功的源做切换；代理出口位置不等于玩家所在地区。浏览仓库／Git Clone 镜像和热门项目集合不直接当作本项目 Release 文件源。
- 只代理 `UIZorrot/Quenching-Client`、`UIZorrot/Quenching-Assets` 的公开 Release 下载链接。不代理 metadata、Raw Content、带 query／账号密码的地址；请求只携带 User-Agent，不发送私钥、PAT、R2 令牌。

## 代码与验证

- `src/Main/services/update-download.ts`：镜像候选、测速、连接释放、流式大小／哈希校验。
- `src/Main/services/client-update-service.ts` 与 `mod-update-service.ts`：原有清单下载调用接入；分片低速不重复重试同一源三次。
- `npm run test:update-download`：隔离 HTTP 测試覆盖低速／停滞／迟迟无响应头切源、快下载、小文件、最后备用源、损坏文件、重定向、句柄释放和镜像 URL 限制。
- `npm run test:update-download -- --live --production-window`：额外验证真实 15 秒策略的中止时刻，以及线上直连和全部候选镜像的实际字节／哈希。

2026-10-04 从发布机用不经过应用系统代理的 Node HTTPS 实测公开 `client-351-00000-a69aca63a216.zst`，GitHub 直连与两个保留镜像均下载 114212 字节，SHA-256 均为 `736abba411af898fb3b87e01576820b8cf977db2c86610b3b8aa95f64016f998`。不据此断言没有系统隧道。补测真实 `QMC3.5-Win.zip` 前 8 MiB，`gh-proxy.com` 约 2.98 MiB/s、`ghproxy.net` 约 1 MiB/s，两者前缀哈希一致；`gh-proxy.org` 和 GitHub 直连均在 15 秒未完成。前缀测速不代替整 ZIP 哈希验收，GitHub 仍是原始签名下载源，不因单次慢速测试永久移除。这些结果不代表中国所有地区速度，也不保证公共镜像容量／可用性。

同次探测 `ghproxy.homeboyc.cn/<ReleaseURL>` 返回 403，`github.akams.cn/<ReleaseURL>` 返回 404；这是该次具体请求的结果，不等于整个站点永久失效，未默认接入。`npm run test:update-download -- --live` 可再次用真实下载器逐个校验已接入的镜像。

候选服务的 [GH-Proxy 使用文档](https://gh-proxy.com/en/docs/github-accelerator/) 与 [ghproxy.net 首页](https://ghproxy.net/) 描述 Release 下载支持；[GH-Proxy 服务条款](https://gh-proxy.com/terms/) 限合法使用且不担保下载内容完整性。因此镜像不是信任来源，不能替代签名／哈希，也不能成为唯一来源。

源码修改必须随下一版客户端发布才会影响玩家。不能只改线上清单就让已分发旧客户端具备低速检测能力；本次没有更改官网清单或 GitHub Release。
