create table if not exists public.governance_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  supplier_id uuid not null,
  item_key text not null,
  label text not null,
  category text not null,
  checked boolean not null default false,
  note_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create unique index if not exists governance_checklist_items_unique
on public.governance_checklist_items (organization_id, supplier_id, item_key);

create index if not exists idx_governance_checklist_items_org
on public.governance_checklist_items (organization_id);

create index if not exists idx_governance_checklist_items_supplier
on public.governance_checklist_items (supplier_id);

alter table public.governance_checklist_items enable row level security;

drop policy if exists "checklist_select" on public.governance_checklist_items;
drop policy if exists "checklist_insert" on public.governance_checklist_items;
drop policy if exists "checklist_update" on public.governance_checklist_items;
drop policy if exists "checklist_delete" on public.governance_checklist_items;

create policy "checklist_select"
on public.governance_checklist_items
for select
using (auth.uid() is not null);

create policy "checklist_insert"
on public.governance_checklist_items
for insert
with check (auth.uid() is not null);

create policy "checklist_update"
on public.governance_checklist_items
for update
using (auth.uid() is not null);

create policy "checklist_delete"
on public.governance_checklist_items
for delete
using (auth.uid() is not null);
