# 功能 1 交接：私有睡前清单与次日邮件

## 集成

首页挂载 `#bedtime-tasks`，加载 `bedtime-tasks.css` 和 defer `bedtime-tasks.js`。本模块不依赖其他前端脚本。server.cjs 已白名单三个功能的 js/css；不暴露数据目录或服务端文件。若存在 reasons-api.cjs 则自动挂载 createReasonsApi({dataDir}) 的 handler。

## 运行配置

- Node 18+，无新增依赖；`npm run dev`，默认只监听 127.0.0.1:4173。
- `DATA_DIR`：可选持久化目录，默认仓库 `.night-owl-data/`，必须排除 Git 并限制文件系统访问；提醒保存在 reminders.json。只支持一个 Node 进程写同一目录。
- `RESEND_API_KEY` 与 `MAIL_FROM`：同时配置才开放安排邮件；MAIL_FROM 必须是供应商允许发信的地址。环境变量由启动进程读取，修改后重启。采用 https://api.resend.com/emails，纯文本邮件，不拼 HTML。
- 服务须在提醒时保持运行；每 15 秒处理到期队列，服务重启补发过期 scheduled 项。网络错误不自动重试，避免重复发信。sending 项在重启后转为 failed/投递结果未知。
- 无配置：本机草稿可用，安排邮件禁用，直接调 API 返回 503，不伪造成功。

已核对供应商官方文档（2026-10-24）：[发送 API](https://resend.com/docs/api-reference/emails/send-email)、[幂等键](https://resend.com/docs/dashboard/emails/idempotency-keys)。Idempotency-Key 由凭据哈希与任务版本时间生成，长度低于 256 字符；供应商仅保存 24 小时，因此本地最终状态负责长期防重复。未配置真实供应商凭据，不声称已实发或实际送达。

## API

所有返回 JSON，Cache-Control: no-store。校验 Origin / Sec-Fetch-Site；私有路由 Authorization: Bearer TOKEN。token 为 32 字节安全随机值，浏览器 localStorage `night-owl-tasks-token-v2`；服务端仅持有 SHA256 索引，不持有原始凭据。仅凭据访问隔离，服务端磁盘为明文，不是端到端加密。

- GET /api/tasks/config → {configured:boolean}
- POST /api/tasks/session → 201 {token}，签发不落盘空记录。
- GET /api/tasks → {reminder:object|null}
- PUT /api/tasks → body {items:string[],email:string,time:'HH:mm',offset:number,currentOffset?:number}，返回 {reminder}。offset 为次日目标时间的 JS getTimezoneOffset，currentOffset 为当前时间偏移，防止跨夏令时误算本地日期。每次保存替换当前计划，安排到提交者当地明天。
- DELETE /api/tasks → {deleted:true}，删除服务器记录。发送中禁止修改/删除（409）。

reminder 包含 items/email/time/offset/scheduledAt/status/error/updatedAt，可含 sentAt。状态 scheduled → sending → sent 或 failed；sent 表示邮件服务 API 明确返回邮件 ID，不保证实际进入收件箱。失败 UI 可重新安排明天，建议先检查邮箱。每 IP 每小时最多安排 30 次，最多 1000 份服务器记录；容量上限是本地 demo 保护，不是公网完整反滥用。

本机草稿键 night-owl-tasks-draft-v2，显式“保存到本浏览器”才保存。私有凭据丢失后无法恢复/删除对应服务器记录，因此页面明确提醒。服务器清单在刷新后恢复；浏览器仍可本地编辑离线草稿。首次安排先持久化凭据，再提交任务，避免成功后失去管理入口。

## 实测

`npm run check`、`node --check bedtime-tasks.js`、`node --check reminder-core.cjs`、`npm test` 通过（原有 3 + 新增 7 = 10 项）。新增覆盖：

- 次日时区/跨年/夏令时偏移与非法输入。
- 私有凭据隔离、原始凭据不写盘、重启恢复、到期仅发一次、删除。
- 未配置邮件拒绝、发送失败和 sending 重启变为未知失败。
- 跨源/无凭据/超大请求拒绝；磁盘数据不能从 HTTP 读取。
- save/remove 磁盘写失败不更改内存，发送前写失败不发送，发送后写失败不重复发送。
- UTF-8 中文跨请求 chunk 不损坏；null JSON 请求受控返回 400。

键盘与 375px/1440px 的整页浏览器复核由集成负责人统一执行。邮件传输代码已实现且官方契约已核对；真实供应商接收/收件箱到达仍待配置后实测。

## 限制

当前为本地单进程持久化服务；服务端管理员可以读取内容。不含账户、跨设备恢复、邮箱验证和公网部署防护。浏览器可手工篡改时区参数；按设备提交偏移安排，用户随后旅行/更改时区不会自动重排。邮件保留到用户删除，不自动过期清理。网络超时和崩溃存在供应商已接收但本地未知的情况，明确转 failed 后由用户查看邮箱决定是否再安排。
