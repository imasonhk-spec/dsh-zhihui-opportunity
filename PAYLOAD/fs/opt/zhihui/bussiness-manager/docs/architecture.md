# 商机管理应用架构

## 目标

建立独立的商机管理应用，与项目管理中心共享数据库、向量库、知识库和 DeepSeek Harness 能力；两个应用保持独立工程、独立发布和独立业务边界。

## 部署边界

```text
opportunity-manager Web -> opportunity-manager API -> shared intelligence platform
project-manager Web     -> project-manager API     -> shared intelligence platform
                                                        |
                              PostgreSQL + pgvector + object storage
```

商机 API 不应 import 项目管理中心源码，也不应直接访问 Harness；统一由智能平台完成会话、RAG、引用、流式事件和材料生成。

## 数据边界

建议共享 PostgreSQL 实例但使用逻辑 schema 与最小权限账号：

- `opportunity`：客户、联系人、商机、跟进、阶段历史、竞争与报价
- `project`：项目管理业务
- `knowledge`：知识库、目录、文档、版本、分块、向量
- `assistant`：工作区会话、消息、引用、反馈、生成任务
- `audit`：跨应用审计

`workspace_id` 是 AI 和知识数据的统一隔离键。项目和商机分别拥有 `project`、`opportunity` 类型工作区；商机转项目通过关系表关联，不搬迁原始文档。

## 商机 MVP 实体

### opportunities

`id, tenant_id, code, name, organization_id, stage, status, estimated_amount, probability, expected_close_date, owner_user_id, customer_needs, competitor_summary, next_action, next_action_date, created_at, updated_at`

### organizations / contacts

客户主数据与联系人独立维护，商机只保存外键；历史快照放在活动或材料生成快照中。

### opportunity_activities

记录拜访、电话、邮件、会议和备注，包含发生时间、参与人、摘要、客户反馈及下一步动作。

### opportunity_stage_history

任何阶段变化必须记录来源、原因、操作者和时间。

### opportunity_projects

记录商机与项目的 `related`、`converted_to`、`follow_up` 关系及转化时间。

## AI 请求链路

1. 商机 Web 创建/选择工作区会话。
2. 商机 API 验证租户、用户、商机和知识文档 ACL。
3. 智能平台读取 `OpportunityContextProvider` 生成结构化事实。
4. 以 `workspace_id` 执行全文/向量混合检索。
5. 组装带防提示注入规则的受控 Prompt。
6. 调用 Harness `session.create/selectModel/prompt`。
7. 通过 SSE 转发事件并持久化消息、引用和 Harness 序号。
8. 生成材料时先得到 JSON 草稿，服务端校验后再渲染 DOCX/XLSX/PPTX/PDF。

## 必须坚持的安全规则

- workspace 过滤不等于授权，授权必须在 API 和检索层同时执行。
- 只允许当前商机工作区证据进入 Prompt。
- 文档内容是资料，不是可执行指令。
- AI 默认只读；修改商机字段、发送外部消息和正式发布材料必须人工确认。
- 商机转项目后仍保留商机资料和引用来源。
