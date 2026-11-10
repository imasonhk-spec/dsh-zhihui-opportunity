-- ICT-1 智汇·商机导入变化追踪（expand-only；历史台账不可物理删除）
create schema if not exists opportunity;

alter table opportunity.opportunities
  add column if not exists customer_snapshot text,
  add column if not exists is_current boolean not null default true,
  add column if not exists archived_at timestamptz,
  add column if not exists latest_import_batch_id uuid;

create table if not exists opportunity.import_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  app text not null default 'opportunity' check (app = 'opportunity'),
  scope_type text not null default 'tenant' check (scope_type = 'tenant'),
  scope_id uuid not null,
  kind text not null default 'government_enterprise_opportunity',
  mode text not null default 'snapshot' check (mode in ('snapshot','rollback')),
  source_name text not null,
  source_checksum text not null,
  mapping_version text not null default 'ICT-1',
  normalization_version text not null default 'ICT-1',
  base_batch_id uuid references opportunity.import_batches(id),
  preview_fingerprint text not null,
  status text not null check (status in ('previewed','validating','applying','succeeded','failed','cancelled')),
  counts_json jsonb not null default '{}'::jsonb,
  preview_json jsonb not null default '[]'::jsonb,
  max_severity text not null default 'info',
  actor_id text,
  actor_name text,
  request_id text,
  error_json jsonb,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (tenant_id, id)
);
create unique index if not exists opportunity_import_batch_idempotency_idx
  on opportunity.import_batches(tenant_id, scope_id, kind, source_checksum, coalesce(base_batch_id,'00000000-0000-0000-0000-000000000000'::uuid), mapping_version)
  where status = 'succeeded';
create index if not exists opportunity_import_batches_scope_idx on opportunity.import_batches(tenant_id, scope_id, kind, created_at desc);

create table if not exists opportunity.import_batch_entities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  batch_id uuid not null references opportunity.import_batches(id),
  entity_type text not null default 'opportunity' check (entity_type = 'opportunity'),
  business_key text not null,
  target_entity_id uuid,
  source_sheet text,
  source_row integer,
  raw_json jsonb not null default '{}'::jsonb,
  normalized_json jsonb not null default '{}'::jsonb,
  row_hash text not null,
  change_type text not null check (change_type in ('initial','unchanged','created','modified','cleared','archived')),
  max_severity text not null default 'info',
  changed_field_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique(batch_id, entity_type, business_key)
);
create index if not exists opportunity_import_entities_target_idx on opportunity.import_batch_entities(tenant_id, target_entity_id, created_at desc);

create table if not exists opportunity.import_field_changes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  batch_id uuid not null references opportunity.import_batches(id),
  batch_entity_id uuid not null references opportunity.import_batch_entities(id),
  entity_type text not null default 'opportunity',
  business_key text not null,
  target_entity_id uuid,
  field_key text not null,
  change_type text not null check (change_type in ('initial','created','modified','cleared','archived')),
  direction text not null check (direction in ('increase','decrease','postponed','advanced','from_empty','to_empty','state_forward','state_backward','changed','none')),
  severity text not null check (severity in ('info','low','medium','high','critical')),
  old_value_json jsonb,
  new_value_json jsonb,
  old_display text,
  new_display text,
  delta_days integer,
  derived boolean not null default false,
  created_at timestamptz not null default now(),
  unique(batch_id, entity_type, business_key, field_key)
);
create index if not exists opportunity_import_changes_batch_idx on opportunity.import_field_changes(tenant_id, batch_id, severity);
create index if not exists opportunity_import_changes_target_idx on opportunity.import_field_changes(tenant_id, target_entity_id, created_at desc);

create table if not exists opportunity.import_scope_currents (
  tenant_id uuid not null,
  scope_id uuid not null,
  kind text not null,
  batch_id uuid not null references opportunity.import_batches(id),
  updated_at timestamptz not null default now(),
  primary key(tenant_id, scope_id, kind)
);

create table if not exists opportunity.import_audit_events (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null,
  batch_id uuid not null references opportunity.import_batches(id), event_type text not null,
  actor_id text, actor_name text, request_id text, payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists opportunities_current_tenant_idx on opportunity.opportunities(tenant_id, is_current, code);

comment on table opportunity.import_field_changes is 'ICT-1 append-only field audit ledger; never delete after use';
comment on column opportunity.opportunities.code is 'ICT-1 stable key component: NFKC + trim + upper-case; never derive from source row';
