CREATE TABLE IF NOT EXISTS opportunity.card_analyses (
  tenant_id uuid NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES opportunity.opportunities(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL CHECK (source IN ('model','rules')),
  model_source text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, opportunity_id)
);
