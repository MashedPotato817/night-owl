# 设计与实现约定

产品范围与验收见 [需求](../demand.md)；本文件只记录实现决策。

## 首页作息投票（兼容 1.0 数据）

作息投票现在是 `/`（`index.html`）主页面，直接展示窗口与身份卡；记录与计票契约继续兼容。

### 页面与视觉

顶部导航 → 夜空页头 → 主投票窗口 / 辅助身份卡、公告、便签 → 底部任务栏。桌面双栏，≤800px 单栏，≤480px 缩紧间距；内容最大宽 1160px。

色值以 `styles.css` 的 `:root` 为准：夜空 `#101c42`、米白 `#f7f3e5`、经典灰 `#cecec7`、标题栏蓝 `#243b83`、月光黄 `#f2da89`。硬边框、凸起按钮、实体阴影；中文系统字体，数字等宽，装饰用 CSS，无外部资源依赖。

## 交互状态

| 状态 | 处理 |
| --- | --- |
| 未投票 | 表单无默认值；选择后启用提交，可先浏览统计 |
| 提交 / 改票 | 替换本机记录，重算结果；焦点移至身份短评，播报反馈 |
| 已投票刷新 | 恢复记录，默认展示结果 |
| 撤回 | 原生 dialog 确认后删除记录，返回表单；取消则保留 |
| 记录损坏 | 忽略非法记录，恢复未投票状态 |
| 存储失败 | 保留会话内体验，提示刷新可能丢失；撤回失败提示旧记录可能仍存在 |
| 其他标签页更新 | 通过 `storage` 事件同步并重新渲染 |

原生 radio 配完整卡片 label；Tab、方向键、Enter 可操作。跳转链接聚焦后可见，正文可接收焦点；弹窗支持 Esc，状态反馈用 `aria-live`。

## 数据契约

- `poll-core.js` 是选项、固定示例数、身份与短评的唯一配置源。`tally()` 从基数重算，不累加历史提交；百分比使用最大余数法。
- localStorage 键：`night-owl-bedtime-v1`；值：`{ version: 1, id: "00to01", at: "ISO 时间字符串" }`。
- 校验要求：版本为 1、ID 属于现有选项、时间可解析。身份由 ID 推导，不单独存储。
- 更换选项 ID 或记录格式时需明确旧记录迁移或失效策略；不要静默复用不兼容数据。
- 页面先加载 `poll-core.js` 再加载 `app.js`；均使用 `defer`。作息投票在浏览器计算；服务器提供白名单资源，同时承担下文的原因投票 API 与邮件队列。

若扩展真实多人版，需另行设计服务端原子计票、请求幂等、反滥用和隐私规则，不把 localStorage 当作身份凭证。


## 3.0 页面与服务

四个静态页面通过原生链接导航：`/` 作息投票、`/tasks.html` 私有清单、`/reasons.html` 清醒心事、`/radio.html` 助眠电台。每页只加载自己的业务脚本和样式；对应挂载点仍为 `#bedtime-tasks`、`#sleep-reasons`、`#sleep-content`，存储键和 API 不变。导航用 `aria-current="page"` 标识唯一当前页，浏览器原生支持刷新、前进后退和新开页。`styles.css` 维护原有视觉，`pages.css` 统一导航、页头、窗口内边距、侧栏与响应式布局，`site.js` 提供子页面关于弹窗和时钟。未保存清单和未发布心事用 `beforeunload` 确认离开，显式保存/成功提交后清除相应未保存状态。没有新增前端框架或依赖。`server.cjs` 负责同源 API、静态白名单、提醒调度，导出 `createApp` 供集成测试。

### 私有清单与邮件（沿用 v2 数据格式）

- 浏览器键 `night-owl-tasks-token-v2` 保存 32 字节随机十六进制 bearer 凭据，`night-owl-tasks-draft-v2` 保存显式草稿；服务端以凭据 SHA-256 作键，绝不在原因接口公开。无账户找回，共用设备不构成私有身份边界。
- `GET /api/tasks/config` 查询配置；`POST /api/tasks/session` 领取凭据；`GET /api/tasks` 读取当前提醒，`PUT` 安排或替换，`DELETE` 删除。清单 1–30 条，每条最多 300 字，服务端校验邮箱及时间。
- 刷新优先显示有效本机草稿；仅在没有本机草稿且用户尚未修改内容时，从服务器填入已有提醒。异步响应不覆盖用户正在输入或刚保存的草稿。保存草稿不更新邮件安排；页面分别显示服务端提醒状态及内容差异，重新安排后才同步。
- 时间按设备次日当地钟点换算 UTC，记录 `scheduledAt`；无配置允许本机保存，不接受服务端邮件安排。服务器 `DATA_DIR/reminders.json` 以凭据哈希为键保存记录，原子落盘后才确认成功，写失败不变更已提交状态。
- Resend HTTPS 邮件传输使用 `RESEND_API_KEY` 与 `MAIL_FROM`；15 秒轮询，到期从 scheduled → sending → sent / failed。sent 表示供应商确认接收，不能等同最终到达。明确失败由用户检查邮箱后重新安排，不盲目重复发送。
- 服务重启恢复持久化队列并处理过期提醒；sending 记录改为 failed（投递结果未知），避免崩溃后盲目重发。发送期间拒绝修改/删除该份提醒；用户可删除其他待发送提醒，队列每次发前读取最新记录，取消/替换不使用旧快照。清单明文持久化，不是端到端加密。
- 同源检查、JSON 正文上限、每地址安排次数限制；提醒容量 1000。数据目录只应由单实例写入，静态白名单不提供数据和密钥。

### 公开原因与共鸣票

- `createReasonsApi({dataDir})` 返回异步路由处理器；非原因路径返回 false。
- `GET /api/reasons` 返回 `{reasons:[{id,text,at,votes,voted}]}`；`POST` 接收 `{text}`，trim 后 1–280 字；`PUT /api/reasons/:id/vote` 接收 `{value:boolean}`，逐条赞同/撤回幂等，可赞同多条。
- 匿名 HttpOnly、SameSite=Strict Cookie `reasons_actor`，服务器仅保存 SHA-256 投票关系；API 不返回投票者。清 Cookie 或换浏览器可绕过身份限制，页面必须说明。
- `DATA_DIR/reasons.json` 保存版本 1 原因与投票，临时文件重命名后替换内存；损坏数据启动失败避免覆盖。最多 300 条、每条 5000 票。每地址十分钟 5 次分享、120 次写操作，节流最多 2000 个地址哈希，重启清空。
- 正文最多 4096 字节，整段 Buffer 解码避免分块损坏中文；同源检查、服务端校验，前端用户内容仅用 textContent。公开内容没有作者删除/审核界面；管理员维护与备份在运行环境进行。

### 助眠内容

官方入口分英语播客与环境音乐：Sleep With Me、Nothing Much Happens、SomaFM Drone Zone / Deep Space One。每项标识内容、来源及语言/订阅情况。只由用户点击后新窗口打开，`noopener noreferrer` 与 no-referrer；没有嵌入播放器、远程图片或自动播放。链接核实来源与浏览器验证统一见 [QA](QA.md)。


## GitHub Pages 导出

`scripts/build-pages.cjs` 仅复制四个 HTML 与业务所需 JS/CSS 到 `_site/`，写入 `.nojekyll`；非白名单文件出现在目标目录时拒绝发布。导出 HTML 增加 `night-owl-mode=static` meta 和 static-mode body class，将站内绝对导航改为相对链接，以兼容 `/night-owl/` 子路径。

静态模式清单只使用 localStorage，隐藏邮件输入和安排按钮，删除不请求服务器；原因页显示服务未连接说明与清单/电台入口，不展示公开提交表单。两个模块均不调用 API，关于弹窗说明可用范围。源码 HTML 无此标记，因此本地 Node 模式不受影响。

main 推送触发 Actions：语法检查与测试 → 导出 → configure-pages → upload-pages-artifact（仅 `_site`）→ deploy-pages；部署使用 github-pages 环境及 Pages/OIDC 权限。
