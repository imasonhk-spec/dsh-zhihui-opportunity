-- 市场拓展&解决方案周会待办导入批次、明细和商机匹配关系
CREATE TABLE IF NOT EXISTS opportunity.market_solution_todo_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  checksum text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  matched_rows integer NOT NULL DEFAULT 0,
  unmatched_rows integer NOT NULL DEFAULT 0,
  knowledge_document_id uuid,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunity.market_solution_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES opportunity.market_solution_todo_imports(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunity.opportunities(id) ON DELETE SET NULL,
  opportunity_key text,
  source_row integer NOT NULL,
  sequence integer,
  established_date date NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  title text NOT NULL,
  owner_name text,
  deadline_text text,
  due_date date,
  opportunity_name_raw text,
  status text NOT NULL DEFAULT 'pending',
  result_remark text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_solution_todos_import_row_uidx UNIQUE(import_id, source_row)
);
CREATE INDEX IF NOT EXISTS market_solution_todos_opportunity_week_idx ON opportunity.market_solution_todos(opportunity_id, week_start, week_end);
CREATE INDEX IF NOT EXISTS market_solution_todos_key_week_idx ON opportunity.market_solution_todos(opportunity_key, week_start, week_end);
CREATE INDEX IF NOT EXISTS market_solution_todos_import_idx ON opportunity.market_solution_todos(import_id, source_row);
CREATE INDEX IF NOT EXISTS market_solution_todos_raw_name_week_idx ON opportunity.market_solution_todos(opportunity_name_raw, week_start, week_end);
