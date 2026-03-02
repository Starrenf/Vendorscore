-- VendorScore v0.5.46 (feature) - Supplier progress tracking (read-only UI first)
-- Purpose: track supplier governance progress WITHOUT adding contract management scope.
-- Run in Supabase SQL editor.

create table if not exists public.supplier_progress (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete cascade,

  inventory_complete boolean not null default false,
  contract_received boolean not null default false,
  last_meeting_at timestamptz null,
  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (organization_id, supplier_id)
);

create index if not exists supplier_progress_org_idx on public.supplier_progress(organization_id);
create index if not exists supplier_progress_supplier_idx on public.supplier_progress(supplier_id);

-- Keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_supplier_progress_updated_at on public.supplier_progress;
create trigger trg_supplier_progress_updated_at
before update on public.supplier_progress
for each row execute function public.set_updated_at();

-- RLS
alter table public.supplier_progress enable row level security;

-- Helpers: organization for current user from profiles
-- Assumes public.profiles has organization_id and id = auth.uid()
create policy "supplier_progress_select_own_org"
on public.supplier_progress
for select
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

create policy "supplier_progress_insert_own_org"
on public.supplier_progress
for insert
to authenticated
with check (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

create policy "supplier_progress_update_own_org"
on public.supplier_progress
for update
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
)
with check (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

create policy "supplier_progress_delete_own_org"
on public.supplier_progress
for delete
to authenticated
using (
  organization_id = (select p.organization_id from public.profiles p where p.id = auth.uid())
);

-- Optional seed example (commented):
-- insert into public.supplier_progress (organization_id, supplier_id, inventory_complete)
-- values ('<ORG_UUID>', '<SUPPLIER_UUID>', true);
