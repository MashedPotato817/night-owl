# 夜猫子 BBS 3.0 · 今晚几点睡

复古 Windows 95 风格的深夜小站：私有睡前清单与次日邮件、匿名原因分享与共鸣投票、播客与音乐外链。范围及验收见 [需求](demand.md)。

## 运行

Node.js **18.17+**，无需安装依赖：

```powershell
npm run dev
```

打开 [今晚几点睡首页](http://127.0.0.1:4173)，通过顶部导航进入 [睡前清单](http://127.0.0.1:4173/tasks.html)、[清醒心事](http://127.0.0.1:4173/reasons.html)、[助眠电台](http://127.0.0.1:4173/radio.html)。Ctrl+C 停止。`PORT` 可指定端口。请通过 HTTP 访问。服务默认监听 `127.0.0.1`；分享社区指同一服务实例的访问者，本机启动不会自动成为公网网站。

## 配置邮件

使用 Resend API；运行环境需持有有效 API key 与已验证的发件地址：

```powershell
$env:RESEND_API_KEY = '<你的 API key>'
$env:MAIL_FROM = '夜猫子 BBS <已验证的发件地址>'
npm start
```

未配置时仍可保存本浏览器清单，页面会禁用邮件安排。配置完成后重新启动服务。不要把真实凭据提交到 Git。

关闭网页不影响运行中的队列；关闭 Node 服务则无法准时发送，重启后补发到期提醒。供应商接收不保证最终到达邮箱。队列、失败及重启语义见 [设计约定](docs/DESIGN.md)。

## 数据与维护

`DATA_DIR` 默认仓库下 `.night-owl-data/`，已忽略 Git；可设置到仓库外的私有持久化目录。备份该目录，保持单进程写入。服务端保存清单明文，浏览器保存高熵访问凭据；清除浏览器数据后无法找回私有记录。原因分享是公开内容。本机草稿与已安排的邮件提醒分别保存；保存草稿不会更新邮件内容，需重新安排提醒才会更新。

自定义数据目录同样不得提交到 Git；对外服务需自行配置 HTTPS、访问入口和内容维护。当前实现没有账户或严格反滥用体系。

## 检查与开发

```powershell
npm run check
npm test
```

语法检查覆盖所有业务脚本；测试覆盖四页路由、首页作息投票、提醒队列/访问隔离和原因 API。浏览器实测及待验证项见 [QA](docs/QA.md)。

| 入口 | 职责 |
| --- | --- |
| `index.html` | 今晚几点睡主页面 |
| `tasks.html` / `reasons.html` / `radio.html` | 三个独立功能页面 |
| `styles.css` / `pages.css` / `site.js` | 统一视觉、导航、子页面弹窗与时钟 |
| `bedtime-tasks.js/css` / `reminder-core.cjs` | 私有清单、邮件安排与发送队列 |
| `reasons.js/css` / `reasons-api.cjs` | 公开原因与幂等共鸣投票 |
| `sleep-content.js/css` | 助眠外链目录 |
| `server.cjs` | API、静态资源白名单与队列调度 |
| `app.js` / `poll-core.js` | 首页作息投票与兼容的本机选票 |

协作规则见 [AGENTS](AGENTS.md)，实现与数据契约见 [DESIGN](docs/DESIGN.md)，集成审查见 [REVIEW](docs/REVIEW.md)。当前发布标签：`v3.0.0`。历史标签 `v1.0.0`、`v2.0.0` 保留。


## GitHub Pages

在线地址：[夜猫子 BBS](https://mashedpotato817.github.io/night-owl/)。GitHub Pages 部署为静态演示：作息示例投票、本机清单和助眠外链可用；邮件提醒、公开原因分享及共鸣投票需要 Node 服务，在线静态版明确显示暂不可用，不发送 API 请求。

推送 main 后，`.github/workflows/pages.yml` 自动检查、测试、导出并部署。发布内容仅来自 `npm run build:pages` 生成的 `_site/` 白名单，不含服务器、数据目录、测试或截图；导航兼容仓库子路径。本地 `npm start` 保留完整 API 模式，已有版本标签不移动。

首次配置 Pages 发布源为 **GitHub Actions**；流程参考 [GitHub 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
