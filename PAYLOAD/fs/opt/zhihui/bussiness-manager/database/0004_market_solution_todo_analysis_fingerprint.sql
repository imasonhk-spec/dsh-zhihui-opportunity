ALTER TABLE opportunity.market_solution_todo_analyses
  ADD COLUMN IF NOT EXISTS fingerprint text;

CREATE INDEX IF NOT EXISTS market_solution_todo_analyses_fingerprint_idx
  ON opportunity.market_solution_todo_analyses(import_id, fingerprint);
