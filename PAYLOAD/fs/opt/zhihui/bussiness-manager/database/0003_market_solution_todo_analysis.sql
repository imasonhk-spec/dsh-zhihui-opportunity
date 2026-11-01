-- 市场拓展&解决方案周会待办模型分析缓存：同一导入批次默认复用已生成结果
CREATE TABLE IF NOT EXISTS opportunity.market_solution_todo_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL UNIQUE REFERENCES opportunity.market_solution_todo_imports(id) ON DELETE CASCADE,
  score numeric(6,2) NOT NULL,
  level text NOT NULL,
  dimensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  judgments jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_source text NOT NULL DEFAULT 'deepseek-harness',
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
