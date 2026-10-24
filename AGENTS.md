# Agent 协作约定

- 开工先读 [需求](demand.md) 与 [README](README.md)，改实现前读 [设计约定](docs/DESIGN.md)。最新用户指令优先；调研建议不自动成为需求。
- 每次围绕一个可验收的行为或问题修改；先完成核心闭环，再扩展功能，避免顺带引入框架或后端。
- 需求变更更新 `demand.md`；实现约定更新 `docs/DESIGN.md`；验证结果更新 `docs/QA.md`。各写一处，其他文档用链接。
- 按改动运行 README 中的对应检查；交互改动复核键盘与手机布局。区分已实现、已实测和待验证。
- Git 消息遵循 [.agents/commit-message/SKILL.md](.agents/commit-message/SKILL.md)；已有版本标签不移动。
