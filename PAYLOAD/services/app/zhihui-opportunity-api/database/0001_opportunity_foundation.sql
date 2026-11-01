-- 商机域第一版基础表；实际执行前请由共享数据库迁移流程确认 schema 与权限。
create schema if not exists opportunity;

create table if not exists opportunity.organizations (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, name text not null,
  unified_code text, industry text, region text, level text, owner_user_id text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);
create table if not exists opportunity.opportunities (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, workspace_id uuid,
  code text not null, name text not null, organization_id uuid references opportunity.organizations(id),
  project_set text, category text, owning_team text, presales_owner text,
  stage text not null default 'lead', status text not null default 'active',
  estimated_amount numeric(14,2), gross_margin numeric(5,2), probability_band text,
  expected_sign_date date, background text, customer_needs text, latest_status text,
  business_type text, owner_user_id text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique (tenant_id, code)
);
create table if not exists opportunity.opportunity_activities (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, opportunity_id uuid not null references opportunity.opportunities(id) on delete cascade,
  activity_type text not null, occurred_at timestamptz, participants text, summary text not null,
  customer_feedback text, next_action text, next_action_date date, created_by text,
  created_at timestamptz not null default now()
);
create table if not exists opportunity.stage_history (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null, opportunity_id uuid not null references opportunity.opportunities(id) on delete cascade,
  from_stage text, to_stage text not null, reason text, changed_by text, changed_at timestamptz not null default now()
);
create table if not exists opportunity.opportunity_projects (
  opportunity_id uuid not null references opportunity.opportunities(id) on delete cascade,
  project_id uuid not null, relation_type text not null, created_at timestamptz not null default now(),
  primary key (opportunity_id, project_id, relation_type)
);
create index if not exists opportunities_tenant_stage_idx on opportunity.opportunities(tenant_id, stage, status);
create index if not exists opportunities_sign_date_idx on opportunity.opportunities(tenant_id, expected_sign_date);
