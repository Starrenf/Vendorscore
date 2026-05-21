-- VendorScore v0.5.62
-- Adds per-checkbox remarks to supplier_governance

alter table if exists public.supplier_governance
  add column if not exists note_text text;

-- Optional: allow empty notes; no extra constraints needed.
