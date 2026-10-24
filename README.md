# 夜猫子 BBS · 今晚几点睡？

复古桌面风熬夜投票 demo：选一个下线时间，领取夜猫子身份。产品范围以 [需求](demand.md) 为准。

## 本地运行

Node.js 18+，无需安装依赖。在仓库根目录运行：

```sh
npm run dev
```

打开 [本地页面](http://127.0.0.1:4173)，Ctrl+C 停止。端口由 `PORT` 环境变量指定；推荐 HTTP 访问，直接打开 HTML 的存储行为可能不同。

```sh
npm run check
npm test
```

分别检查脚本语法与计票规则；界面回归见 [QA](docs/QA.md)。

## 开发入口

| 文件 | 职责 |
| --- | --- |
| `index.html` / `styles.css` | 页面结构、复古视觉与响应式布局 |
| `app.js` | 事件、渲染、本地记录、弹窗 |
| `poll-core.js` | 选项、身份文案、记录校验、计票 |
| `server.cjs` | 本地静态服务；新增资源需更新白名单 |
| `tests/poll-core.test.cjs` | 计票与非法记录测试 |

## 文档

- [demand.md](demand.md)：原始要求、当前范围、验收标准。
- [AGENTS.md](AGENTS.md)：Agent 工作方式与提交规则。
- [DESIGN](docs/DESIGN.md)：实现约定与数据契约。
- [调研](docs/活动网页调研.md)：参考来源与取舍。
- [QA](docs/QA.md) / [Review](docs/REVIEW.md)：验证证据与初版审查。

初版标签：`v1.0.0`（`98d0635`）。后续修改保留此基线。
