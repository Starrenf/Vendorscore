-- VendorScore DB sync script (current build)
alter table public.suppliers add column if not exists strategic_type text;
alter table public.suppliers add column if not exists category text;
alter table public.suppliers add column if not exists inventory_status text default 'Open';
alter table public.suppliers add column if not exists contract_received boolean default false;
alter table public.suppliers add column if not exists meeting_status text default 'Nog niet';
alter table public.suppliers add column if not exists progress_notes text;
alter table public.suppliers add column if not exists supplier_owner text;
alter table public.suppliers add column if not exists governance_score integer;
alter table public.suppliers add column if not exists risk_level text;
alter table public.suppliers add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'suppliers_strategic_type_check'
  ) then
    alter table public.suppliers
      add constraint suppliers_strategic_type_check
      check (strategic_type in ('Strategisch','Hefboom','Knelpunt','Routine') or strategic_type is null);
  end if;
end $$;

alter table public.supplier_governance add column if not exists note_text text;
alter table public.supplier_governance add column if not exists updated_at timestamptz default now();
alter table public.supplier_governance add column if not exists updated_by uuid;

create index if not exists idx_suppliers_organization_id on public.suppliers (organization_id);
create index if not exists idx_suppliers_name on public.suppliers (name);
create index if not exists idx_suppliers_strategic_type on public.suppliers (strategic_type);
create index if not exists idx_supplier_governance_supplier_id on public.supplier_governance (supplier_id);
create index if not exists idx_supplier_governance_item_key on public.supplier_governance (item_key);

update public.suppliers
set strategic_type = coalesce(strategic_type, 'Routine'),
    category = coalesce(category, 'Algemeen'),
    inventory_status = coalesce(inventory_status, 'Open'),
    contract_received = coalesce(contract_received, false),
    meeting_status = coalesce(meeting_status, 'Nog niet'),
    updated_at = now()
where strategic_type is null
   or category is null
   or inventory_status is null
   or contract_received is null
   or meeting_status is null
   or updated_at is null;

notify pgrst, 'reload schema';
