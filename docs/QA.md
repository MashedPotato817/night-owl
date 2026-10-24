# 验证记录

2026-10-24，初版 `v1.0.0`；本机 Node.js + Codex 内置浏览器，HTTP 访问。以下为历史实测，不代表后续改动自动通过。

| 检查 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 语法通过；3 项测试覆盖基数、五档选择、重复计算、改票总量、撤回及非法记录 |
| 投票闭环 | 初始禁用→选择启用→提交显示身份与 1,025 票；改票总量不变；刷新恢复 |
| 撤回 | 取消保留；确认后刷新回到未投票状态 |
| 键盘 | Tab、方向键、Enter 可投票；跳转链接可聚焦，Enter 后焦点进入正文；见 [Review](REVIEW.md) |
| 布局 | 375×812、1440×1080 无横向溢出；手机结果顶部显示身份 |
| 控制台 | 检查时无 error / warn |

后续回归：自动检查使用 README 命令；交互修改重走投票、改票、撤回、刷新与键盘流程；布局修改检查以上两种视口。记录实际结果，未测项明确标注。

未单独模拟多标签页竞态、禁用存储；未做跨浏览器矩阵或实体手机测试。

截图在 Git 忽略的 `artifacts/`：`desktop-vote.png`、`desktop-results.png`、`mobile-vote.png`、`mobile-results.png`、`review-keyboard-skip.png`；克隆仓库后需重新生成。


## 2.0 集成验证（2026-10-24）

环境：Windows、Node.js、Playwright Chromium，本地 HTTP；主 Agent 实测整页，三个 Agent 的独立检查经 review 汇总。邮件配置态浏览器使用注入测试传输，没有向真实邮箱发信。

| 检查 | 结果 |
| --- | --- |
| `npm run check` / `npm test` | 所有业务脚本语法通过；计票、原因 API、提醒队列共 17 项测试通过 |
| 未配置邮件 | 明确提示未配置，安排按钮禁用；本机保存后刷新恢复「明天回复邮件」 |
| 配置态提醒 UI | 测试传输下输入两条事项、邮箱、08:30，用 Enter 安排；刷新显示次日 2026/10/25 08:30；确认删除后刷新凭据与内容清空 |
| 原因发布与共鸣 | 发布中文及 script 字面文本，未执行脚本；Enter 投票后可撤回，刷新恢复 0 票与分享内容 |
| 真实共享/访问隔离 | API 测试覆盖多访客共享、私有凭据隔离、投票者隐藏、重复投票幂等、重启恢复及数据文件不可从 HTTP 访问 |
| 键盘与导航 | 首次 Tab / Enter 跳到 main；三个导航锚点可直达；原生表单、Enter 安排与投撤票、确认框可操作；助眠链接 Tab 焦点可见 |
| 旧投票 | 选择→提交→改票→撤回取消→确认撤回闭环通过；原计票测试保持通过 |
| 布局 | 整页 375×812、1440×1080 的 scrollWidth 分别为 375、1440，无横向溢出；截图目检通过，手机单列、桌面助眠目录双栏 |
| 助眠外链 | Agent 独立实测四个44px链接、Enter新开官方页面；无媒体嵌入或后台第三方资源请求 |
| 控制台 | 集成最终页面 0 error / 0 warning；补充内联空 favicon 消除初测 favicon 404 |
| 故障边界 | 自动测试覆盖损坏数据、UTF-8 分块、超大正文、跨源、节流、磁盘写失败、发送未知状态、防止盲目重发、等待前一封期间取消/替换后一份提醒 |

官方内容于 2026-10-24 联网核实：[Sleep With Me](https://www.sleepwithmepodcast.com/)、[Nothing Much Happens](https://www.nothingmuchhappens.com/stories)、[Drone Zone](https://somafm.com/dronezone/)、[Deep Space One](https://somafm.com/deepspaceone/)。邮件传输参数与幂等键核对 [Resend 发送文档](https://resend.com/docs/api-reference/emails/send-email) 和 [幂等文档](https://resend.com/docs/dashboard/emails/idempotency-keys)。

**待验证：**真实 Resend 接收与邮箱到达、各地区第三方播放器可用性、跨浏览器与实体手机、长期在线运维。无真实邮件凭据，因此不把模拟传输测试计作真实发信。无公网部署或远端 Git 推送。

整页截图存于 Git 忽略目录 `artifacts/`：`v2-mobile.png`、`v2-mobile-final.png`、`v2-desktop.png`。独立模块截图在 worktree 清理前已备份至主仓库 `artifacts/sleep-content-agent-backup/output/playwright/`。截图是本机产物，克隆后需重跑。


## 独立页面调整（2026-10-24，v2.0.0 标签之后）

按最新要求，首页恢复直接展示「今晚几点睡」，三个功能分别为独立页面。此节结果覆盖本次变更，前文为历史记录。

- `npm run check` 通过，`npm test` 18/18 通过。新增 HTTP 集成检查直接访问/重复刷新四页、统一导航、单页业务资源隔离及数据目录不可访问。
- Playwright Chromium 通过顶部导航遍历四页；375×812 与 1440×1080 下，四页 scrollWidth 均等于视口宽度。8 张整页截图已目检；手机四列导航保持可见、单列内容，桌面清单/心事配侧栏、助眠目录双列。
- 首页用方向键选择、Tab/Enter 提交；跨页返回并刷新仍恢复选票；确认撤回成功。首次 Tab 聚焦跳转链接，Enter 后焦点进入 main。
- 清单保存后跳到助眠页，再后退/刷新恢复内容；未保存时跳页出现 beforeunload，取消后留在清单页。未发布心事跳页同样确认，取消后内容仍在，未产生公开测试留言。
- 子页面「关于本站」弹窗打开、Esc 关闭；未配置邮件状态和禁用按钮正确，浏览器控制台 0 error / 0 warning。
- 页面拆分沿用 API、Cookie 路径和 localStorage 键；真实邮件接收仍待配置验证，本次未向真实邮箱发信，也未修改人工测试的公开数据。

截图位于 Git 忽略目录 `artifacts/pages-{home,tasks,reasons,radio}-{375,1440}.png`。实体手机、跨浏览器以及浏览器/系统强制结束进程时的内容保留未实测；离开确认不替代显式保存。


## 3.0 发布验证（2026-10-24）

版本元数据、首页 VOL.003 与关于文案已对齐 3.0；四页路由与数据格式保持兼容。以本次检查及前节独立页面实测为发布依据。

- 发布前重新运行 `npm run check`、`npm test` 和 `git diff --check`：语法与差异检查通过，18/18 项自动测试通过（磁盘故障测试的预期错误日志不代表失败）。
- Playwright 使用独立浏览器会话与模拟提醒响应，复现「本机存新草稿，刷新却显示旧邮件内容」；修复后刷新显示新草稿，并提示内容尚未更新到邮件提醒。
- 延迟模拟服务器响应期间分别输入未保存内容、输入并保存新草稿，响应到达后均保留新内容；无本机草稿且未编辑时，正常恢复服务器提醒。此验证未修改人工测试服务器的数据，也未调用真实邮件传输。
- 浏览器确认首页 VOL.003 和关于弹窗 3.0 文案正确。
- 页面交互、键盘、跨页恢复和 375px / 1440px 布局实测见前节；真实邮箱到达、跨浏览器、实体手机仍待验证。


## Pages 部署预检（2026-10-24）

- `npm run check`、`npm test`（19/19）、`npm run build:pages` 通过。新增导出测试确认白名单、静态标记、相对导航及拒绝混入非发布文件。
- 在 `/night-owl/` 子路径静态预览中，Playwright 遍历四页成功；本机清单保存并刷新恢复，邮件输入隐藏，分享页显示不可用说明；整个流程无 API 请求，控制台 0 error / 0 warning。
- 375×812 静态心事页 scrollWidth=375，截图 `artifacts/pages-static-mobile.png` 已目检。完整 Node 模式测试仍通过；Pages 不提供真实发信或共享留言服务。
- 实际部署结果以 GitHub Actions 与线上 HTTP/浏览器检查为准，发布完成后补充。
