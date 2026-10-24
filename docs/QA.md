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

整页截图存于 Git 忽略目录 `artifacts/`：`v2-mobile.png`、`v2-mobile-final.png`、`v2-desktop.png`。独立模块截图保留在助眠 Agent worktree 的 `output/playwright/`。截图是本机产物，克隆后需重跑。
