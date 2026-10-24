# 睡不着原因分享交接

## 实现状态

已实现同服务器访客公开匿名分享、逐条「我也一样」投票与撤回、刷新留言、错误反馈。无需账号。没有示例留言与示例票，空服务器显示真实空态。

`reasons.js` 自初始化挂载 `#sleep-reasons`，需主页面加载 `reasons.css` 与 defer 脚本。所有访客内容使用 `textContent` 渲染。按钮原生可键盘操作、状态使用 aria-live，投票后恢复同条按钮焦点；手机样式为单列与可换行布局。

## 服务集成契约

`const { createReasonsApi } = require('./reasons-api.cjs')`；启动时创建一次 `const handleReasons = createReasonsApi({dataDir})`，请求中 `if (await handleReasons(req,res,url)) return;`。非原因路径返回 false，已处理返回 true。`url` 是 URL 对象。静态白名单增加 `/reasons.js` 和 `/reasons.css`。

- `GET /api/reasons` → `{reasons:[{id,text,at,votes,voted}]}`，最新发布在前。
- `POST /api/reasons` JSON `{text}` → 201 `{reason}`，trim 后 1–280 UTF-16 字符。
- `PUT /api/reasons/:id/vote` JSON `{value:true|false}` → `{reason}`。true 为赞同、false 为撤回，每条独立、重复请求幂等；支持同时赞同多条。
- 错误 `{error:中文说明}`；400 输入、403 跨站、404 不存在、405 方法、409 容量、413 超过 4096 字节正文、415 非 JSON、429 节流、503 保存失败。

匿名 HttpOnly / SameSite=Strict Cookie `reasons_actor`，路径 `/api/reasons`，有效期一年；直接 HTTPS 时加 Secure。服务器仅保存 Cookie UUID 的 SHA-256 值与投票关系，不返回投票者。Cookie 不可用时记票无法可靠恢复，页面已明确匿名限制。

`dataDir/reasons.json` 版本 1，原子临时文件重命名落盘后才返回成功。同步写入使单进程并发请求串行更新；损坏文件启动失败，避免覆盖。服务重启恢复留言/投票。

## 限制

上限 300 条留言，每条 5000 票；不自动丢弃旧留言。每个 IP 十分钟最多 5 次分享、120 次写操作，节流窗口内最多记录 2000 个地址的哈希。节流重启清空。反向代理后使用 socket 地址，可能把多位访客视为同一地址。单进程文件持久化，不能多个进程同时写同目录。

没有登录、严格防刷、审核、作者删除界面或举报系统。清 Cookie、换浏览器可重复投票；公开发布前应配置内容管理、反滥用与备份。真实互联网部署和人工审核不在本次范围内。

## 验证

新增 `tests/reasons-api.test.cjs` 覆盖多访客共享、并发重复投票/撤回、重启恢复、隐藏投票者、非法输入、跨站、正文限制、节流、持久化失败和损坏数据。

运行 `npm test`、`npm run check` 与 `node --check reasons-api.cjs`、`node --check reasons.js`；集成后应补测浏览器键盘与 375px / 1440px 布局、Cookie 与真实服务器错误态。API 已实测；浏览器结果由主集成记录到 docs/QA.md。
