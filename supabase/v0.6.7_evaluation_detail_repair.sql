-- VendorScore v0.6.7 - evaluation detail / scores repair
-- Run in Supabase SQL editor when your current schema still has older naming / keys.

begin;

-- evaluation_scores: app expects criteria_id
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'evaluation_scores'
      and column_name = 'criterion_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'evaluation_scores'
      and column_name = 'criteria_id'
  ) then
    alter table public.evaluation_scores rename column criterion_id to criteria_id;
  end if;
end $$;

alter table public.evaluation_scores
  add column if not exists organization_id uuid;

create index if not exists idx_evaluation_scores_org_id
  on public.evaluation_scores (organization_id);

create index if not exists idx_evaluation_scores_criteria_id
  on public.evaluation_scores (criteria_id);

alter table public.evaluation_scores
  drop constraint if exists evaluation_scores_criterion_id_fkey;

alter table public.evaluation_scores
  drop constraint if exists evaluation_scores_criteria_id_fkey;

alter table public.evaluation_scores
  add constraint evaluation_scores_criteria_id_fkey
  foreign key (criteria_id)
  references public.criteria (id)
  on delete cascade;

create unique index if not exists evaluation_scores_unique
  on public.evaluation_scores (evaluation_id, criteria_id);

-- evaluations: allow multiple evaluation titles per year for same supplier within an organisation
alter table public.evaluations
  drop constraint if exists evaluations_supplier_id_year_key;

drop index if exists public.evaluations_supplier_id_year_key;
drop index if exists public.evaluations_unique;
drop index if exists public.evaluations_org_supplier_year_title_unique;

create unique index if not exists evaluations_unique
  on public.evaluations (organization_id, supplier_id, year, coalesce(title, ''));

commit;
