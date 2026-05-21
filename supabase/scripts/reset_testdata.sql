-- Reset testdata for Gilde Opleidingen
DELETE FROM public.evaluation_scores
WHERE organization_id = '7ec54263-6b9b-4cb2-9b97-526d8909550d';

DELETE FROM public.evaluations
WHERE organization_id = '7ec54263-6b9b-4cb2-9b97-526d8909550d';

DELETE FROM public.org_invites
WHERE organization_id = '7ec54263-6b9b-4cb2-9b97-526d8909550d';

DELETE FROM public.weight_configs
WHERE organization_id = '7ec54263-6b9b-4cb2-9b97-526d8909550d';
