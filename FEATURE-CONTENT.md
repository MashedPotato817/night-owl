# 功能 3：助眠内容跳转交接

## 实现与挂载契约

- 新增 `sleep-content.js` 和 `sleep-content.css`；沿用现有 `styles.css` 的复古窗口与色值。
- 页面提供 `<section id="sleep-content"></section>`，加载样式，并以 `defer` 加载脚本。脚本自初始化；缺少挂载点时静默返回，重复加载不会重复插入。
- 请集成方将两个资源加入 `server.cjs` 的静态白名单及 `sleep-content.js` 语法检查。导航可直接使用 `href="#sleep-content"`。
- 两类各两项：英语播客、环境音乐。显示内容说明、语言、来源、订阅/广告提示、核实日期。
- 四个 HTTPS 外链全部使用 `_blank`、`noopener noreferrer`、`referrerPolicy="no-referrer"`，文字和无障碍名称提示新窗口。
- 无播放器、远程封面、iframe、追踪代码或后台请求，不读取或写入用户数据。文案仅为放松陪伴，不作治疗承诺。
- 此分支不修改全局文档、入口与服务；正式验收结果由集成方汇总至 `docs/QA.md`。

## 官方来源（2026-10-24 实际联网核实）

| 内容 | 官方落地页 | 核实内容 |
| --- | --- | --- |
| Sleep With Me | <https://www.sleepwithmepodcast.com/> | 睡前故事播客，官网提供最新节目、广告支持与付费订阅入口 |
| Nothing Much Happens | <https://www.nothingmuchhappens.com/stories> | 官方 Bedtime Stories 栏目，节目列表与播客平台入口；官网另有 Premium |
| Drone Zone | <https://somafm.com/dronezone/> | SomaFM 环境与太空音乐频道，少量节拍，官网提供收听按钮 |
| Deep Space One | <https://somafm.com/deepspaceone/> | SomaFM 环境电子、实验与太空音乐频道，官网提供收听按钮 |

## 已执行检查

- `node --check sleep-content.js`、`npm run check`：通过。
- `npm test`：现有 3 项测试通过。
- 用临时本地 HTTP harness 加载原站样式与本模块，Playwright Chromium 实测：375 × 812 时文档宽度为 375；1440 × 1000 时文档宽度为 1440，双栏宽度各 529px。
- Tab 从第一个收听链接进入，再按一次移至第二个；焦点框为 solid；四个链接触控高度均为 44px。按 Enter 后，Nothing Much Happens 官方故事页面在第二个标签页成功打开，原目录页保留。
- DOM 中 audio、video、iframe 数为 0；网络日志仅本地静态资源。控制台唯一错误是临时 harness 无 favicon 的 404，无脚本错误。
- 已打开并目视检查手机全长截图与桌面截图：无裁切、重叠或横向溢出。截图位于本 worktree 的 `output/playwright/content-mobile.png` 与 `content-desktop.png`（不提交构建产物）。

## 待集成复核

- 与另两个模块合并后的整页导航、键盘顺序与手机布局由集成方复测。
- 外部页面已由联网读取核实；未自动播放音频，未逐一实测第三方播放器，具体可访问性受用户网络与第三方服务影响。
