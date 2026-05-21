-- Seed standaard VendorScore criteria (K1 t/m K5, A t/m E) voor een organisatie
-- Vervang de organization_id hieronder indien nodig

with target_org as (
  select '7ec54263-6b9b-4cb2-9b97-526d8909550d'::uuid as organization_id
), seed(section, label, points_max) as (
  values
    ('K1','Criterium A',10),('K1','Criterium B',10),('K1','Criterium C',10),('K1','Criterium D',10),('K1','Criterium E',10),
    ('K2','Criterium A',10),('K2','Criterium B',10),('K2','Criterium C',10),('K2','Criterium D',10),('K2','Criterium E',10),
    ('K3','Criterium A',10),('K3','Criterium B',10),('K3','Criterium C',10),('K3','Criterium D',10),('K3','Criterium E',10),
    ('K4','Criterium A',10),('K4','Criterium B',10),('K4','Criterium C',10),('K4','Criterium D',10),('K4','Criterium E',10),
    ('K5','Criterium A',10),('K5','Criterium B',10),('K5','Criterium C',10),('K5','Criterium D',10),('K5','Criterium E',10)
)
insert into public.criteria (organization_id, section, label, points_max)
select t.organization_id, s.section, s.label, s.points_max
from target_org t
cross join seed s
where not exists (
  select 1
  from public.criteria c
  where c.organization_id = t.organization_id
    and c.section = s.section
    and c.label = s.label
);
