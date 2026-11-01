# 商机应用实施计划

## Phase 0：底座确认

- 确认数据库 schema、pgvector 实际维度、Embedding 配置和迁移顺序。
- 确认统一身份、租户、组织、对象存储与 Harness 鉴权。
- 定义 workspace、ACL、审计和商机转项目规则。

## Phase 1：商机 MVP

- 客户、联系人、商机台账。
- 阶段漏斗、列表筛选、详情页。
- 跟进记录、阶段历史、操作审计。
- Excel 导入预览、确认提交、错误报告。

## Phase 2：知识与共享 AI

- 商机工作区和知识库。
- 文档版本、解析、分块、Embedding、混合检索。
- 独立智能平台 API，项目和商机 API 均通过 HTTP 调用。

## Phase 3：商机智能助手

参考项目指导中心的三栏 UI：左侧会话和资料目录，中间流式对话，右侧最近文件、商机摘要和生成材料。

快捷指令首批包括：商机汇报、拜访纪要、需求分析、解决方案大纲、竞争分析、商机转项目移交单。

## Phase 4：材料生成

材料生成任务必须保存模板版本、业务数据快照、检索证据快照、会话 ID 和结果文件版本。模型先输出 JSON，服务端 Schema 校验后按模板渲染，不让模型直接生成二进制 Office 文件。

## MVP API

### 商机域

- `GET/POST /api/opportunities`
- `GET/PATCH /api/opportunities/:id`
- `GET/POST /api/opportunities/:id/activities`
- `POST /api/opportunities/:id/stage`
- `GET/POST /api/opportunities/:id/contacts`
- `GET/POST /api/opportunities/:id/projects`
- `POST /api/opportunities/import/preview`
- `POST /api/opportunities/import/:jobId/commit`

### 智能平台

- `GET/POST /api/workspaces/:id/conversations`
- `GET /api/workspaces/:id/conversations/:conversationId/messages`
- `POST /api/workspaces/:id/conversations/:conversationId/messages`
- `GET /api/workspaces/:id/conversations/:conversationId/events`
- `POST /api/workspaces/:id/conversations/:conversationId/cancel`
- `POST /api/workspaces/:id/material-jobs`
- `GET /api/material-jobs/:jobId`
- `GET /api/generated-materials/:id/download`

## 验收门槛

- 商机 A 无法检索商机 B 的知识和会话。
- 会话刷新可恢复，SSE 断线可恢复或明确失败。
- 引用可回到文档版本，回答证据不足时不编造。
- 导入必须预览后确认，不得按文件名覆盖正式记录。
- 生成材料可追溯模板、数据快照、证据快照和版本。
