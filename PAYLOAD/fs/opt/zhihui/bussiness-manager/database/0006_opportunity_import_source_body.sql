-- Preserve previewed workbook bytes until confirmation so production knowledge archival occurs only after a successful import.
alter table opportunity.import_batches
  add column if not exists source_body bytea;

comment on column opportunity.import_batches.source_body is
  'Original XLSX bytes retained for confirmed import archival and audit; preview alone does not publish knowledge.';
