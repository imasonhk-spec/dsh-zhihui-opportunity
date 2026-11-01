# Opportunity Manager

独立的商机管理应用。与项目管理中心共享 PostgreSQL、pgvector、对象存储、知识库与 DeepSeek Harness 智能能力，但保持独立工程、API、构建和部署。

## 当前状态

本仓库处于架构与 MVP 骨架阶段，业务应用暂不直接依赖项目管理中心源码。

## 目录约定

- `apps/web`：商机管理前端
- `apps/api`：商机业务 API
- `database`：商机域迁移与共享底座迁移
- `docs`：架构、接口和实施计划

## 开发前提

1. 确认共享数据库实际 pgvector 维度和迁移顺序。
2. 确认统一身份、租户和工作区权限。
3. 共享智能能力应通过 HTTP API，不从项目管理中心复制内部模块。

## 建议命令

```bash
pnpm install
pnpm typecheck
pnpm build:web
pnpm build:api
```
